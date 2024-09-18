using Microsoft.EntityFrameworkCore.Storage;
using ReHUD.Models.LapData;

namespace ReHUD.Interfaces
{
    public interface ILapDataService
    {
        public static readonly string DATA_PATH = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "ReHUD", "UserData.db");
        public static readonly int MAX_ENTRIES = 20;

        public void SaveChanges();
        public IDbContextTransaction BeginTransaction();

        public T AttachContext<T>(T context) where T : Context;
        public void AddContext(Context context);
        public LapData LogLap(LapContext context, bool valid, double lapTime);
        public void Log(LapPointer entry);
        public bool RemoveLapPointer<T>(T pointer) where T : LapPointer;

        public CombinationSummary GetCombinationSummary(int trackLayoutId, int carId);
        public LapData? GetLap(int lapId);
        public LapData? GetBestLap(int trackLayoutId, int carId);
        public LapData? GetBestLap(int trackLayoutId, int carId, int classPerformanceIndex);
    }
}
