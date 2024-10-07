using Microsoft.EntityFrameworkCore.Storage;
using ReHUD.Models.LapData;

namespace ReHUD.Interfaces
{
    public interface ILapDataService
    {
        public static readonly string DATA_PATH = Path.Combine(IUserData.dataPath, "UserData.db");
        public static readonly int MAX_ENTRIES = 10;

        public void SaveChanges();
        public IDbContextTransaction BeginTransaction();

        public T AttachContext<T>(T context) where T : Context;
        public LapData LogLap(LapContext context, bool valid, double lapTime);
        public void Log<T>(T entry) where T : LapPointer;
        public bool RemoveLapPointer<T>(T pointer) where T : LapPointer;

        public CombinationSummary GetCombinationSummary(int trackLayoutId, int carId, int classPerformanceIndex);
        public LapData? GetLap(int lapId);
        public LapData? GetCarBestLap(int trackLayoutId, int carId, int classPerformanceIndex);
        public LapData? GetClassBestLap(int trackLayoutId, int carId, int classPerformanceIndex);
    }
}
