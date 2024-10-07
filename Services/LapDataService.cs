using log4net;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using ReHUD.Interfaces;
using ReHUD.Models.LapData;

namespace ReHUD.Services {
    /// <summary>
    /// This is a special service which is not used with dependency injection.
    /// It is not used with dependency injection because the DB context isn't thread safe.
    /// </summary>
    public class LapDataService : ILapDataService, IDisposable {
        private static readonly ILog logger = LogManager.GetLogger(typeof(LapDataService));
    
        private readonly LapDataContext context;

        public LapDataService() {
            try {
                Directory.CreateDirectory(Path.GetDirectoryName(ILapDataService.DATA_PATH)!);
                context = new LapDataContext(new DbContextOptionsBuilder<LapDataContext>().EnableSensitiveDataLogging().UseLazyLoadingProxies().UseSqlite($"Data Source={ILapDataService.DATA_PATH};Mode=ReadWriteCreate").Options);
                context.Database.Migrate();
                context.Database.EnsureCreated();
                DisableWAL();
            } catch (Exception e) {
                logger.Error("Failed to create LapDataContext", e);
                throw;
            }
        }

        public void DisableWAL() {
            context.Database.ExecuteSqlRaw("PRAGMA journal_mode = DELETE");
        }

        public void Dispose() {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing) {
            if (disposing) {
                context.Dispose();
            }
        }

        public void SaveChanges() {
            context.SaveChanges();
        }

        private IEnumerable<T> MatchingContexts<T>(IContextQuery query) where T : Context {
            foreach (var c in context.Set<T>().AsEnumerable()) {
                if (c is T t && query.Matches(t)) {
                    yield return t;
                }
            }
        }

        private T? SingleMatchingContext<T>(IContextQuery query) where T : Context {
            return MatchingContexts<T>(query).SingleOrDefault();
        }

        /// <summary>
        /// Gets the lap context for a car and track layout.
        /// </summary>
        /// <param name="trackLayoutId"></param>
        /// <param name="carId"></param>
        /// <param name="classPerformanceIndex">Not used for querying, updates the ClassPerformanceIndex of the returned context. This is done to allow filling missing class performance indexes of data converted from the old JSON format.</param>
        /// <returns></returns>
        private LapContext? GetExactLapContext(int trackLayoutId, int carId, int classPerformanceIndex) {
            var lapContext = SingleMatchingContext<LapContext>(new LapContextQuery {
                TrackLayoutId = trackLayoutId,
                CarId = carId,
            });

            if (lapContext != null && classPerformanceIndex != lapContext.ClassPerformanceIndex) {
                lapContext.ClassPerformanceIndex = classPerformanceIndex;
                SaveChanges();
            }

            return lapContext;
        }

        /// <summary>
        /// Gets the lap context for a car and track layout, or the best lap context for the class if no context for the specific car exists.
        /// </summary>
        /// <param name="trackLayoutId"></param>
        /// <param name="carId"></param>
        /// <param name="classPerformanceIndex"></param>
        /// <returns></returns>
        private LapContext? GetClassLapContext(int trackLayoutId, int carId, int classPerformanceIndex) {
            var byCarId = GetExactLapContext(trackLayoutId, carId, classPerformanceIndex);
            if (byCarId != null) {
                return byCarId;
            }

            var byClassPerformanceIndex = MatchingContexts<LapContext>(new LapContextQuery {
                TrackLayoutId = trackLayoutId,
                ClassPerformanceIndex = classPerformanceIndex,
            });
            if (!byClassPerformanceIndex.Any()) {
                return null;
            }

            // Get best lap for class if no car specific context exists.
            return byClassPerformanceIndex.MinBy(c => c.BestLap != null ? c.BestLap.LapTime.Value : double.MaxValue);
        }


        private static IEnumerable<T> MaybeFilterLapPointersByContext<T>(IEnumerable<T> pointers, T maybeWithContext) where T : LapPointer {
            if (maybeWithContext is IEntityWithContext contextEntity) {
                return pointers.Where(p => ((IEntityWithContext) p).Context == contextEntity.Context);
            }
            return pointers;
        }

        /// <summary>
        /// Logs a lap pointer to the database, ensuring that the number of entries is limited.
        /// </summary>
        /// <param name="entry"></param>
        /// <exception cref="ArgumentException"></exception>
        public void Log<T>(T entry) where T : LapPointer {
            if (context.Find(entry.GetType(), entry.Id) != null) {
                return;
            }

            if (entry is IEntityWithContext contextEntity) {
                contextEntity.Context = AttachContext(contextEntity.Context);
            }

            var lapContext = entry.LapContext;

            if (entry is Telemetry telemetry) {
                var oldLap = lapContext.BestLap;
                var newLap = telemetry.Lap;
                if (oldLap == newLap) {
                    return;
                }

                if (oldLap == null || oldLap.Telemetry == null || oldLap.LapTime.Value > newLap.LapTime.Value) {
                    RemoveLapPointer(oldLap?.Telemetry); // Mark old telemetry for removal.
                    newLap.Context.BestLap = newLap;
                    context.Add(telemetry);
                } else {
                    RemoveLapPointer(telemetry); // We don't keep telemetry for laps that are not the best lap.
                }
                SaveChanges();
            } else {
                IEnumerable<T> entries = entry switch
                {
                    LapTime => (IEnumerable<T>) lapContext.LapTimes,
                    TireWear => (IEnumerable<T>) lapContext.TireWears,
                    FuelUsage => (IEnumerable<T>) lapContext.FuelUsages,
                    _ => throw new ArgumentException("Invalid type"),
                };

                var entriesFiltered = MaybeFilterLapPointersByContext(entries.Where(e => !e.PendingRemoval), entry);
                if (entriesFiltered.Count() >= ILapDataService.MAX_ENTRIES) {
                    var entriesSorted = entriesFiltered.OrderBy(e => e.Lap.Timestamp).ToList();
                    for (int i = 0; i < entriesSorted.Count - ILapDataService.MAX_ENTRIES + 1; i++) {
                        RemoveLapPointer(entriesSorted[i]);
                    }
                }
                if (!entries.Contains(entry)) {
                    context.Add(entry);
                }
                SaveChanges();
            }
        }

        public IDbContextTransaction BeginTransaction() {
            return context.Database.BeginTransaction();
        }

        private static double? Average<T>(IEnumerable<T> list, Func<T, double> selector) {
            if (!list.Any()) {
                return null;
            }
            return list.Average(selector);
        }

        private static TireWearObj? Average(IEnumerable<TireWear> list) {
            if (!list.Any()) {
                return null;
            }
            return new TireWearObj {
                FrontLeft = list.Average(l => l.Value.FrontLeft),
                FrontRight = list.Average(l => l.Value.FrontRight),
                RearLeft = list.Average(l => l.Value.RearLeft),
                RearRight = list.Average(l => l.Value.RearRight),
            };
        }

        public CombinationSummary GetCombinationSummary(int trackLayoutId, int carId, int classPerformanceIndex) {
            try {
                LapContext? lapContext = GetExactLapContext(trackLayoutId, carId, classPerformanceIndex);
                if (lapContext == null) {
                    return new CombinationSummary {
                        TrackLayoutId = trackLayoutId,
                        CarId = carId,
                    };
                }
                var lapTimes = lapContext.LapTimes;
                var tireWears = lapContext.TireWears;
                var fuelUsages = lapContext.FuelUsages;
                var bestLap = lapContext.BestLap;
                return new CombinationSummary {
                    TrackLayoutId = trackLayoutId,
                    CarId = carId,
                    AverageLapTime = Average(lapTimes, l => l.Value),
                    AverageTireWear = Average(tireWears),
                    AverageFuelUsage = Average(fuelUsages, l => l.Value),
                    LastLapTime = lapTimes.LastOrDefault()?.Value,
                    LastTireWear = tireWears.LastOrDefault()?.Value,
                    LastFuelUsage = fuelUsages.LastOrDefault()?.Value,
                    BestLapTime = bestLap?.LapTime.Value,
                };
            } catch (Exception e) {
                logger.Error("Failed to get combination summary", e);
                throw;
            }
        }

        public LapData? GetLap(int lapId) {
            return context.LapDatas.Find(lapId);
        }

        public static LapData? GetBestLap(LapContext? context) {
            return context?.BestLap;
        }

        public LapData? GetCarBestLap(int trackLayoutId, int carId, int classPerformanceIndex) {
            return GetBestLap(GetExactLapContext(trackLayoutId, carId, classPerformanceIndex));
        }

        public LapData? GetClassBestLap(int trackLayoutId, int carId, int classPerformanceIndex) {
            return GetBestLap(GetClassLapContext(trackLayoutId, carId, classPerformanceIndex));
        }


        /// <summary>
        /// Updates the best lap for a car and track layout if the given lap is better.
        /// </summary>
        /// <param name="lapData">The lap to compare.</param>
        private void UpdateBestLap(LapData lapData) {
            if (lapData.Telemetry != null) {
                Log(lapData.Telemetry);
            }
        }

        /// <summary>
        /// Adds a lap to the database.
        /// </summary>
        /// <param name="lapLog">The lap to add.</param>
        /// <returns>True if the added lap is the best lap for the car and track layout, false otherwise.</returns>
        public LapData LogLap(LapContext context, bool valid, double lapTime) {
            context = AttachContext(context);
            logger.DebugFormat("Logging lap ({0}) for context {1}, Id={2}", lapTime, context, context.Id);

            var lap = new LapData(context, valid, lapTime);
            this.context.Add(lap);

            foreach (var p in lap.Pointers) {
                Log(p);
            }

            // Update best lap if necessary.
            UpdateBestLap(lap);
            SaveChanges();
            return lap;
        }

        private static bool ShouldRemoveLapContext(LapContext context) {
            return context.Entries.Count == 0;
        }

        private static bool ShouldRemoveLap(LapData data) {
            return data.Pointers.TrueForAll(p => p.PendingRemoval);
        }

        public T AttachContext<T>(T context) where T : Context {
            var existingContext = (T?) this.context.Find(context.GetType(), context.Id);
            if (existingContext != null) {
                return existingContext;
            }

            logger.DebugFormat("Creating new context {0}, Id={1}", context, context.Id);

            this.context.Add(context);
            SaveChanges();
            return context;
        }
        
        private void RemoveContext(LapContext context) {
            this.context.Remove(context);
            SaveChanges();
        }


        private void RemoveLap(LapData data) {
            foreach (var p in data.Pointers) {
                context.Remove(p);
            }
            context.Remove(data);

            if (ShouldRemoveLapContext(data.Context)) {
                RemoveContext(data.Context);
            }
            SaveChanges();
        }

        public bool RemoveLapPointer<T>(T? pointer) where T : LapPointer {
            if (pointer == null) {
                return false;
            }

            pointer.PendingRemoval = true;
            if (ShouldRemoveLap(pointer.Lap)) {
                RemoveLap(pointer.Lap);
            }
            SaveChanges();

            return true;
        }
    }
}