using ElectronNET.API;
using ElectronNET.API.Entities;
using log4net;
using R3E.Data;
using ReHUD.Extensions;
using ReHUD.Interfaces;
using ReHUD.Models;
using ReHUD.Utils;

namespace ReHUD.Services
{
    public class R3eDataService : IR3eDataService, IDisposable
    {
        public static readonly ILog logger = LogManager.GetLogger(typeof(R3eDataService));

        private R3eData data;
        private R3eExtraData extraData;
        private FuelData fuelData;
        private LapPointsData lapPointsData;

        private IRaceRoomObserver raceRoomObserver;
        private ISharedMemoryService sharedMemoryService;

        private readonly AutoResetEvent resetEvent;
        private CancellationTokenSource cancellationTokenSource = new();

        private volatile bool _isRunning = false;
        public bool IsRunning { get => _isRunning; }

        public R3eExtraData Data { get => extraData; }
        public FuelData FuelData { get => fuelData; }
        public LapPointsData LapPointsData { get => lapPointsData; }

        private BrowserWindow window;
        public BrowserWindow HUDWindow { get => window; set => window = value; }
        private bool? hudShown = false;
        public bool? HUDShown { get => hudShown; set => hudShown = value; }
        private string[]? usedKeys;
        public string[]? UsedKeys { get => usedKeys; set => usedKeys = value; }

        private volatile bool enteredEditMode = false;
        private volatile bool recordingData = false;
        private double lastFuel = -1;
        private volatile int lastLap = -1;

        public R3eDataService(IRaceRoomObserver raceRoomObserver, ISharedMemoryService sharedMemoryService) {
            this.raceRoomObserver = raceRoomObserver;
            this.sharedMemoryService = sharedMemoryService;

            extraData = new() {
                forceUpdateAll = false
            };
            fuelData = new();
            lapPointsData = new();

            resetEvent = new AutoResetEvent(false);

            this.raceRoomObserver.OnProcessStarted += RaceRoomStarted;
            this.raceRoomObserver.OnProcessStopped += RaceRoomStopped;

            sharedMemoryService.OnDataReady += OnDataReady;
        }

        public void Load() {
            fuelData.Load();
            lapPointsData.Load();
        }

        public void Save() {
            fuelData.Save();
            lapPointsData.Save();
        }

        public void Dispose() {
            cancellationTokenSource.Cancel();

            this.raceRoomObserver.OnProcessStarted -= RaceRoomStarted;
            this.raceRoomObserver.OnProcessStopped -= RaceRoomStopped;

            resetEvent.Dispose();
        }

        private void RaceRoomStarted() {
            logger.Info($"RaceRoom started, starting R3eDataService worker");

            cancellationTokenSource.Cancel();
            cancellationTokenSource.Dispose();

            cancellationTokenSource = new();
            Task.Run(() => ProcessR3eData(cancellationTokenSource.Token), cancellationTokenSource.Token);
        }

        private void RaceRoomStopped() {
            logger.Info($"RaceRoom stopped, stopping R3eDataService worker");

            cancellationTokenSource.Cancel();
            _isRunning = false;
        }

        private void OnDataReady(R3eData data) {
            this.data = data;
            resetEvent.Set();
        }

        private async Task ProcessR3eData(CancellationToken cancellationToken) {
            logger.Info("Starting R3eDataService worker");

            int iter = 0;
            var userDataClearedForMultiplier = false;

            while (!cancellationToken.IsCancellationRequested) {
                resetEvent.WaitOne();
                resetEvent.Reset();

                extraData.timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                if (data.fuelUseActive != 1 && !userDataClearedForMultiplier) {
                    userDataClearedForMultiplier = true;
                    fuelData.Save();
                    fuelData.Clear();
                }
                else if (data.fuelUseActive == 1 && userDataClearedForMultiplier) {
                    userDataClearedForMultiplier = false;
                    fuelData.Clear();
                    fuelData.Load();
                }

                extraData.rawData = data;
                extraData.rawData.numCars = Math.Max(data.numCars, data.position); // Bug in shared memory, sometimes numCars is updated in delay, this partially fixes it
                extraData.rawData.driverData = extraData.rawData.driverData.Take(extraData.rawData.numCars).ToArray();
                if (data.layoutId != -1 && data.vehicleInfo.modelId != -1 && iter % sharedMemoryService.FrameRate == 0) {
                    FuelCombination combination = fuelData.GetCombination(data.layoutId, data.vehicleInfo.modelId);
                    extraData.fuelPerLap = combination.GetAverageFuelUsage();
                    extraData.fuelLastLap = combination.GetLastLapFuelUsage();
                    extraData.averageLapTime = combination.GetAverageLapTime();
                    extraData.bestLapTime = combination.GetBestLapTime();
                    Tuple<int, double> lapData = Utilities.GetEstimatedLapCount(data, combination);
                    extraData.estimatedRaceLapCount = lapData.Item1;
                    extraData.lapsUntilFinish = lapData.Item2;
                    iter = 0;
                }
                iter++;

                lastLap = data.completedLaps;

                Func<Task> saveDataTask = () => {
                    try {
                        SaveData(data);
                    }
                    catch (Exception e) {
                        logger.Error("Error saving data", e);
                    }
                    return Task.CompletedTask;
                };

                Func<Task> updateHUDTask = async () => {
                    if (enteredEditMode) {
                        extraData.forceUpdateAll = true;
                        await IpcCommunication.Invoke(window, "r3eData", extraData.Serialize(usedKeys));
                        extraData.forceUpdateAll = false;
                        enteredEditMode = false;
                    }
                    else {
                        await IpcCommunication.Invoke(window, "r3eData", extraData.Serialize(usedKeys));
                    }
                };

                Func<Task> updateHUDStateTask = async () => {
                    bool notDriving = data.IsNotDriving();
                    if (notDriving) {
                        if (window != null && (hudShown ?? true)) {
                            Electron.IpcMain.Send(window, "hide");
                            hudShown = false;
                        }

                        recordingData = false;

                        if (data.sessionType == -1) {
                            lastLap = -1;
                            lastFuel = -1;
                        }
                    }
                    else if (window != null && !(hudShown ?? false)) {
                        Electron.IpcMain.Send(window, "show");
                        window.SetAlwaysOnTop(true, OnTopLevel.screenSaver);
                        hudShown = true;
                    }
                };

                await Task.WhenAll(saveDataTask(), updateHUDTask(), updateHUDStateTask());
            }

            logger.Info("R3eDataService worker thread stopped");
        }

        private void SaveData(R3eData data) {
            if (lastLap == -1 || lastLap == data.completedLaps || fuelData == null)
                return;

            if (!recordingData) {
                recordingData = true;
                lastFuel = data.fuelLeft;
                return;
            }

            var fuelNow = data.vehicleInfo.engineType == 1 ? data.batterySoC : data.fuelLeft;

            int modelId = data.vehicleInfo.modelId;
            int layoutId = data.layoutId;
            FuelCombination combo = fuelData.GetCombination(layoutId, modelId);

            if (data.lapTimePreviousSelf > 0)
                combo.AddLapTime(data.lapTimePreviousSelf);

            if (data.fuelUseActive >= 1 && lastFuel != -1) {
                combo.AddFuelUsage(lastFuel - fuelNow, data.lapTimePreviousSelf > 0);
            }

            if (data.fuelUseActive <= 1)
                fuelData.Save();

            lastFuel = fuelNow;
        }

        public void SetEnteredEditMode() {
            enteredEditMode = true;
        }

        public void SaveBestLap(int layoutId, int classId, double laptime, double[] points, double pointsPerMeter) {
            LapPointsCombination combination = lapPointsData.GetCombination(layoutId, classId);
            combination.Set(laptime, points, pointsPerMeter);

            lapPointsData.Save();
        }
        public string LoadBestLap(int layoutId, int classId) {
            LapPointsCombination? combination = lapPointsData.GetCombination(layoutId, classId, false);
            if (combination == null)
                return "{}";
            return combination.Serialize();
        }

        public async Task SendEmptyData() {
            var extraData = new R3eExtraData {
                forceUpdateAll = true,
                rawData = new R3eData {
                    driverData = Array.Empty<DriverData>(),
                },
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            };
            logger.Info("Sending empty data for edit mode");
            await IpcCommunication.Invoke(window, "r3eData", extraData.Serialize(usedKeys));
        }
    }
}
