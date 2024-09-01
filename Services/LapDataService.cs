using System.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using ReHUD.Interfaces;
using ReHUD.Models.LapData;

namespace ReHUD.Services {
    public class LapDataService : ILapDataService, IDisposable {
        private readonly LapDataContext context;

        public LapDataService(LapDataContext context) {
            try {
                this.context = context;
                this.context.Database.EnsureCreated();
            } catch (Exception e) {
                Startup.logger.Error("Failed to create LapDataContext", e);
                throw;
            }
        }

        public void SaveChanges() {
            context.SaveChanges();
        }

        private LapContext? GetLapContext(int trackLayoutId, int carId) {
            return context.LapsContext.Where(c => c.TrackLayoutId == trackLayoutId && c.CarId == carId).FirstOrDefault();
        }

        private LapContext? GetLapContext(int trackLayoutId, int carId, int classPerformanceIndex, bool forceCarId = false) {
            if (forceCarId) {
                return context.LapsContext.Where(c => c.TrackLayoutId == trackLayoutId && c.CarId == carId && c.ClassPerformanceIndex == classPerformanceIndex).FirstOrDefault();
            } else {
                var byClassPerformanceIndex = context.LapsContext.Where(c => c.TrackLayoutId == trackLayoutId && c.ClassPerformanceIndex == classPerformanceIndex);
                var byCarId = byClassPerformanceIndex.Where(c => c.CarId == carId);
                if (byCarId.Any()) {
                    return byCarId.First();
                }
                // Get best lap for class if no car specific context exists.
                return byClassPerformanceIndex.OrderBy(c => c.BestLap != null ? c.BestLap.LapTime.Value : double.MaxValue).FirstOrDefault();
            }
        }

        /// <summary>
        /// Logs a lap pointer to the database, ensuring that the number of entries is limited.
        /// </summary>
        /// <param name="entry"></param>
        /// <exception cref="ArgumentException"></exception>
        public void Log(LapPointer entry) {
            if (context.Find(entry.GetType(), entry.Id) != null) {
                return;
            }

            var lapContext = entry.Context;

            if (entry is Telemetry telemetry) {
                var oldLap = lapContext.BestLap;
                var newLap = telemetry.Lap;
                if (oldLap == null || oldLap.LapTime.Value > newLap.LapTime.Value) {
                    RemoveLapPointer(oldLap?.Telemetry); // Mark old telemetry for removal.
                    newLap.Context.BestLap = newLap;
                    context.Add(telemetry);
                } else {
                    RemoveLapPointer(telemetry);
                }
                SaveChanges();
                return;
            }

            IEnumerable<LapPointer> entries = entry switch
            {
                LapTime => lapContext.LapTimes,
                TireWear => lapContext.TireWears,
                FuelUsage => lapContext.FuelUsages,
                _ => throw new ArgumentException("Invalid type"),
            };

            var entriesFiltered = entries.Where(e => !e.PendingRemoval);
            if (entriesFiltered.Count() >= ILapDataService.MAX_ENTRIES) {
                var entriesSorted = entriesFiltered.OrderBy(e => e.Lap.Timestamp).ToList();
                for (int i = 0; i < entriesSorted.Count - ILapDataService.MAX_ENTRIES + 1; i++) {
                    RemoveLapPointer(entriesSorted[i]);
                }
            }
            context.Add(entry);
            SaveChanges();
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

        public CombinationSummary GetCombinationSummary(int trackLayoutId, int carId) {
            try {
                var lapContext = GetLapContext(trackLayoutId, carId);
                if (lapContext == null) {
                    return new CombinationSummary {
                        TrackLayoutId = trackLayoutId,
                        CarId = carId,
                    };
                }
                var laps = lapContext.Laps;
                var tireWears = lapContext.TireWears;
                var fuelUsages = lapContext.FuelUsages;
                var bestLap = lapContext.BestLap;
                return new CombinationSummary {
                    TrackLayoutId = trackLayoutId,
                    CarId = carId,
                    AverageLapTime = Average(laps, l => l.LapTime.Value),
                    AverageTireWear = Average(tireWears),
                    AverageFuelUsage = Average(fuelUsages, l => l.Value),
                    LastLapTime = laps.LastOrDefault()?.LapTime.Value,
                    LastTireWear = tireWears.LastOrDefault()?.Value,
                    LastFuelUsage = fuelUsages.LastOrDefault()?.Value,
                    BestLapTime = bestLap?.LapTime.Value,
                };
            } catch (Exception e) {
                Startup.logger.Error("Failed to get combination summary", e);
                throw;
            }
        }

        public LapData? GetLap(int lapId) {
            return context.LapsData.Find(lapId);
        }

        public static LapData? GetBestLap(LapContext? context) {
            return context?.BestLap;
        }

        public LapData? GetBestLap(int trackLayoutId, int carId) {
            return GetBestLap(GetLapContext(trackLayoutId, carId));
        }

        public LapData? GetBestLap(int trackLayoutId, int carId, int classPerformanceIndex) {
            return GetBestLap(GetLapContext(trackLayoutId, carId, classPerformanceIndex));
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
            this.context.Attach(context);

            var lap = new LapData {
                Timestamp = DateTime.Now,
                Context = context,
                Valid = valid,
                LapTime = new LapTime { Value = lapTime },
            };
            this.context.Add(lap);
            this.context.Add(lap.LapTime);

            foreach (var p in lap.Pointers) {
                Log(p);
            }

            // Update best lap if necessary.
            UpdateBestLap(lap);
            SaveChanges();
            return lap;
        }

        private static bool ShouldRemoveLapContext(LapContext context) {
            return context.Laps.Count == 0;
        }

        private static bool ShouldRemoveLap(LapData data) {
            return data.Pointers.TrueForAll(p => p.PendingRemoval);
        }
        
        public LapContext GetLapContextOrCreate(int trackLayoutId, int carId, int classPerformanceIndex) {
            var existingContext = GetLapContext(trackLayoutId, carId, classPerformanceIndex, true);
            if (existingContext != null) {
                return existingContext;
            }

            var newContext = new LapContext {
                TrackLayoutId = trackLayoutId,
                CarId = carId,
                ClassPerformanceIndex = classPerformanceIndex,
            };

            AddContext(newContext);
            SaveChanges();
            return newContext;
        }

        public void AddContext(LapContext context) {
            this.context.Add(context);
            SaveChanges();
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

        public void Dispose() {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing) {
            if (disposing) {
                context.Dispose();
            }
        }
    }
}