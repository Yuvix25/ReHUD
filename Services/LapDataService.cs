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
            }
        }

        private void SaveChanges() {
            context.SaveChanges();
        }

        private static List<T> GetMatchingEntries<T>(DbSet<T> dbSet, LapContext context) where T : LogWithContext {
            return dbSet.Where(e => e.Context.TrackLayoutId == context.TrackLayoutId && e.Context.CarId == context.CarId).ToList();
        }

        private void LogConstrainedToMax<T>(DbSet<T> dbSet, T entry) where T : LogWithContext {
            var entries = GetMatchingEntries(dbSet, entry.Context);
            if (entries.Count >= ILapDataService.MAX_ENTRIES) {
                var entriesSorted = entries.OrderBy(e => e.Context.Timestamp).ToList();
                for (int i = 0; i < entriesSorted.Count - ILapDataService.MAX_ENTRIES + 1; i++) {
                    RemoveLogWithContext(entriesSorted[i]);
                }
            }
            dbSet.Add(entry);
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

        private static TireWear? Average(IEnumerable<TireWearLog> list) {
            if (!list.Any()) {
                return null;
            }
            return new TireWear {
                FrontLeft = list.Average(l => l.TireWear.FrontLeft),
                FrontRight = list.Average(l => l.TireWear.FrontRight),
                RearLeft = list.Average(l => l.TireWear.RearLeft),
                RearRight = list.Average(l => l.TireWear.RearRight),
            };
        }

        public CombinationSummary GetCombinationSummary(int trackLayoutId, int carId) {
            try {
                var partialContext = new LapContext { TrackLayoutId = trackLayoutId, CarId = carId };
                var laps = GetMatchingEntries(context.LapLogs, partialContext);
                var tireWearLogs = GetMatchingEntries(context.TireWearLogs, partialContext);
                var fuelUsageLogs = GetMatchingEntries(context.FuelUsageLogs, partialContext);
                var bestLap = GetBestLapLog(trackLayoutId, carId);
                return new CombinationSummary {
                    TrackLayoutId = trackLayoutId,
                    CarId = carId,
                    AverageLapTime = Average(laps, l => l.LapTime),
                    AverageTireWear = Average(tireWearLogs),
                    AverageFuelUsage = Average(fuelUsageLogs, l => l.FuelUsage),
                    LastLapTime = laps.Any() ? laps[^1].LapTime : null,
                    LastTireWear = tireWearLogs.Any() ? tireWearLogs[^1].TireWear : null,
                    LastFuelUsage = fuelUsageLogs.Any() ? fuelUsageLogs[^1].FuelUsage : null,
                    BestLapTime = bestLap?.LapTime,
                };
            } catch (Exception e) {
                Startup.logger.Error("Failed to get combination summary", e);
                throw;
            }
        }

        public LapLogWithTelemetry? GetBestLapLog(int trackLayoutId, int carId) {
            return context.BestLapLogs.Where(l => l.Context.TrackLayoutId == trackLayoutId && l.Context.CarId == carId).FirstOrDefault();
        }

        public LapLogWithTelemetry? GetBestLapLog(int trackLayoutId, int carId, int classPerformanceIndex) {
            var byClassPerformanceIndex = context.BestLapLogs.Where(l => l.Context.TrackLayoutId == trackLayoutId && l.Context.ClassPerformanceIndex == classPerformanceIndex);
            var byCarId = byClassPerformanceIndex.Where(l => l.Context.CarId == carId);
            return byCarId.FirstOrDefault() ?? byClassPerformanceIndex.FirstOrDefault();
        }

        public void LogContext(LapContext context) {
            this.context.LapContexts.Add(context);
            SaveChanges();
        }

        /// <summary>
        /// Updates the best lap for a car and track layout if the given lap is better.
        /// </summary>
        /// <param name="lapLog">The lap to compare.</param>
        /// <returns>True if the best lap was updated, false otherwise.</returns>
        private bool UpdateBestLap(LapLog lapLog) {
            if (lapLog is LapLogWithTelemetry lapWithTelemetry) {
                var bestLap = GetBestLapLog(lapLog.Context.TrackLayoutId, lapLog.Context.CarId);
                if (bestLap == null || lapLog.LapTime < bestLap.LapTime) {
                    if (bestLap != null) {
                        context.BestLapLogs.Remove(bestLap);
                    }
                    context.BestLapLogs.Add(lapWithTelemetry);

                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// Adds a lap to the database.
        /// </summary>
        /// <param name="lapLog">The lap to add.</param>
        /// <returns>True if the added lap is the best lap for the car and track layout, false otherwise.</returns>
        public bool LogLap(LapLog lapLog) {
            LogConstrainedToMax(context.LapLogs, lapLog);

            // Update best lap if necessary.
            var updated = UpdateBestLap(lapLog);
            SaveChanges();

            return updated;
        }

        private DbSet<T> GetDbSet<T>() where T : LogWithContext {
            if (typeof(T) == typeof(LapLog)) {
                return context.LapLogs as DbSet<T>;
            } else if (typeof(T) == typeof(TireWearLog)) {
                return context.TireWearLogs as DbSet<T>;
            } else if (typeof(T) == typeof(FuelUsageLog)) {
                return context.FuelUsageLogs as DbSet<T>;
            }
            throw new ArgumentException("Invalid type");
        }

        private static bool ContextHasLogs(LapContext context) {
            return context.LapLog != null || context.TireWearLog != null || context.FuelUsageLog != null;
        }

        public bool RemoveLogWithContext<T>(T log) where T : LogWithContext {
            var dbSet = GetDbSet<T>();
            if (!dbSet.Contains(log)) {
                return false;
            }

            dbSet.Remove(log);
            // check if context is still used
            if (!ContextHasLogs(log.Context)) {
                context.LapContexts.Remove(log.Context);
            }
            SaveChanges();
            return true;
        }

        public void LogTireWear(TireWearLog tireWearLog) {
            LogConstrainedToMax(context.TireWearLogs, tireWearLog);
            SaveChanges();
        }

        public void LogFuelUsage(FuelUsageLog fuelUsageLog) {
            LogConstrainedToMax(context.FuelUsageLogs, fuelUsageLog);
            SaveChanges();
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