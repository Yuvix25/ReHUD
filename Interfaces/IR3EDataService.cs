using ElectronNET.API;
using ReHUD.Models;

namespace ReHUD.Interfaces
{
    public interface IR3EDataService : IDisposable
    {
        public R3EExtraData Data { get; }
        public FuelData FuelData { get; }
        public LapPointsData LapPointsData { get; }

        public BrowserWindow HUDWindow { get; set; }
        public bool? HUDShown { get; set; }
        public string[]? UsedKeys { get; set; }

        public void Load();
        public void Save();

        public void SetEnteredEditMode();
        public Task SendEmptyData();

        public void SaveBestLap(int layoutId, int classId, double laptime, double[] points, double pointsPerMeter);
        public string LoadBestLap(int layoutId, int classId);
    }
}
