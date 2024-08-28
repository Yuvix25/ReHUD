using Microsoft.EntityFrameworkCore.Storage;
using ReHUD.Models.LapData;

namespace ReHUD.Interfaces
{
    public interface ILapDataService
    {
        public static readonly string DATA_PATH = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "ReHUD", "UserData.db");
        public static readonly int MAX_ENTRIES = 20;

        public IDbContextTransaction BeginTransaction();
        public CombinationSummary GetCombinationSummary(int trackLayoutId, int carId);
        public LapLogWithTelemetry? GetBestLapLog(int trackLayoutId, int carId);
        public LapLogWithTelemetry? GetBestLapLog(int trackLayoutId, int carId, int classPerformanceIndex);

        public void LogContext(LapContext context);
        public bool LogLap(LapLog lap);
        public bool RemoveLogWithContext<T>(T log) where T : LogWithContext;
        public void LogTireWear(TireWearLog tireWearLog);
        public void LogFuelUsage(FuelUsageLog fuelUsageLog);
    }
}
