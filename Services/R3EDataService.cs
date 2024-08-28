using ElectronNET.API;
using ElectronNET.API.Entities;
using log4net;
using Microsoft.EntityFrameworkCore.Storage;
using R3E.Data;
using ReHUD.Extensions;
using ReHUD.Interfaces;
using ReHUD.Models;
using ReHUD.Models.LapData;
using ReHUD.Utils;

namespace ReHUD.Services
{
    public class R3EDataService : IR3EDataService, IDisposable
    {
        public static readonly ILog logger = LogManager.GetLogger(typeof(R3EDataService));

        private R3EData data;
        private R3EExtraData extraData;
        private readonly LapPointsData lapPointsData;

        private readonly ILapDataService lapDataService;
        private readonly IRaceRoomObserver raceRoomObserver;
        private readonly ISharedMemoryService sharedMemoryService;

        private readonly AutoResetEvent resetEvent;
        private CancellationTokenSource cancellationTokenSource = new();

        private volatile bool _isRunning = false;
        public bool IsRunning { get => _isRunning; }

        public R3EExtraData Data { get => extraData; }
        public LapPointsData LapPointsData { get => lapPointsData; }

        private BrowserWindow window;
        public BrowserWindow HUDWindow { get => window; set => window = value; }
        private bool? hudShown = false;
        public bool? HUDShown { get => hudShown; set => hudShown = value; }
        private string[]? usedKeys;
        public string[]? UsedKeys { get => usedKeys; set => usedKeys = value; }

        private volatile bool enteredEditMode = false;
        private volatile bool recordingData = false;
        private float? lastFuel = null;
        private float? lastFuelUsage = null;
        private TireWear? lastTireWear = null;
        private TireWear? lastTireWearDiff = null;
        private volatile int lastLap = -1;

        public R3EDataService(ILapDataService lapDataService, IRaceRoomObserver raceRoomObserver, ISharedMemoryService sharedMemoryService) {
            this.lapDataService = lapDataService;
            this.raceRoomObserver = raceRoomObserver;
            this.sharedMemoryService = sharedMemoryService;

            extraData = new() {
                forceUpdateAll = false
            };
            lapPointsData = new();

            resetEvent = new AutoResetEvent(false);

            this.raceRoomObserver.OnProcessStarted += RaceRoomStarted;
            this.raceRoomObserver.OnProcessStopped += RaceRoomStopped;

            sharedMemoryService.OnDataReady += OnDataReady;
        }

        public void Load() {
            lapPointsData.Load();
        }

        public void Save() {
            lapPointsData.Save();
        }

        public void Dispose() {
            cancellationTokenSource.Cancel();

            raceRoomObserver.OnProcessStarted -= RaceRoomStarted;
            raceRoomObserver.OnProcessStopped -= RaceRoomStopped;

            resetEvent.Dispose();
        }

        private void RaceRoomStarted() {
            logger.Info("RaceRoom started, starting R3EDataService worker");

            cancellationTokenSource.Cancel();
            cancellationTokenSource.Dispose();

            cancellationTokenSource = new();
            Task.Run(() => ProcessR3EData(cancellationTokenSource.Token), cancellationTokenSource.Token);
        }

        private void RaceRoomStopped() {
            logger.Info("RaceRoom stopped, stopping R3EDataService worker");

            cancellationTokenSource.Cancel();
            _isRunning = false;
        }

        private void OnDataReady(R3EData data) {
            this.data = data;
            resetEvent.Set();
        }

        private async Task ProcessR3EData(CancellationToken cancellationToken) {
            logger.Info("Starting R3EDataService worker");

            int iter = 0;
            IDbContextTransaction? multiplierTransaction = null;

            while (!cancellationToken.IsCancellationRequested) {
                resetEvent.WaitOne();
                resetEvent.Reset();

                extraData.timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                if (data.fuelUseActive != 1 && multiplierTransaction == null) {
                    multiplierTransaction = lapDataService.BeginTransaction();
                }
                else if (data.fuelUseActive == 1 && multiplierTransaction != null) {
                    await multiplierTransaction.RollbackAsync(cancellationToken);
                    multiplierTransaction.Dispose();
                    multiplierTransaction = null;
                }

                extraData.rawData = data;
                extraData.rawData.numCars = Math.Max(data.numCars, data.position); // Bug in shared memory, sometimes numCars is updated in delay, this partially fixes it
                extraData.rawData.driverData = extraData.rawData.driverData.Take(extraData.rawData.numCars).ToArray();
                if (data.layoutId != -1 && data.vehicleInfo.modelId != -1 && iter % sharedMemoryService.FrameRate == 0) {
                    CombinationSummary combination = lapDataService.GetCombinationSummary(data.layoutId, data.vehicleInfo.modelId);
                    extraData.fuelPerLap = combination.AverageFuelUsage;
                    extraData.fuelLastLap = lastFuelUsage;
                    extraData.tireWearPerLap = combination.AverageTireWear;
                    extraData.tireWearLastLap = lastTireWearDiff;
                    extraData.averageLapTime = combination.AverageLapTime;
                    extraData.bestLapTime = combination.BestLapTime;
                    Tuple<int?, double?> lapData = Utilities.GetEstimatedLapCount(data, combination.BestLapTime ?? -1);
                    extraData.estimatedRaceLapCount = lapData.Item1;
                    extraData.lapsUntilFinish = lapData.Item2;
                    iter = 0;
                }
                iter++;

                if (data.IsNotDriving()) {
                    recordingData = false;
                }

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
                    if (data.IsInMenus()) {
                        if (window != null && (hudShown ?? true)) {
                            Electron.IpcMain.Send(window, "hide");
                            hudShown = false;
                        }

                        if (data.sessionType == -1) {
                            lastLap = -1;
                            lastFuel = null;
                            lastTireWear = null;
                        }
                    }
                    else if (window != null && !(hudShown ?? false)) {
                        Electron.IpcMain.Send(window, "show");
                        window.SetAlwaysOnTop(!Startup.IsInVrMode, OnTopLevel.screenSaver);
                        hudShown = true;
                    }
                };

                await Task.WhenAll(saveDataTask(), updateHUDTask(), updateHUDStateTask());

                lastLap = data.completedLaps;
            }

            logger.Info("R3EDataService worker thread stopped");
        }

        private static TireWear AsTireWear(TireData<float> tireWear) {
            return new TireWear {
                FrontLeft = tireWear.frontLeft,
                FrontRight = tireWear.frontRight,
                RearLeft = tireWear.rearLeft,
                RearRight = tireWear.rearRight,
            };
        }

        private void SaveData(R3EData data) {
            if (lastLap == -1 || lastLap == data.completedLaps) {
                return;
            }

            float? fuelNow = data.vehicleInfo.engineType == 1 ? data.batterySoC : data.fuelLeft;
            fuelNow = fuelNow == -1 ? null : fuelNow;
            var tireWearNow = AsTireWear(data.tireWear);

            if (recordingData) {
                bool lapValid = data.lapTimePreviousSelf > 0;

                bool tireWearDataValid = lastTireWear != null && tireWearNow != null;
                TireWear? tireWearDiff = tireWearDataValid ? tireWearNow! - lastTireWear! : null;

                bool fuelDataValid = lastFuel != null && fuelNow != -1;
                float? fuelDiff = fuelDataValid ? lastFuel - fuelNow : null;

                var context = new LapContext {
                    Timestamp = DateTime.UtcNow,
                    TrackLayoutId = data.layoutId,
                    CarId = data.vehicleInfo.modelId,
                    ClassPerformanceIndex = data.vehicleInfo.classPerformanceIndex,
                    Valid = lapValid,
                };
                lapDataService.LogContext(context);

                if (lapValid) {
                    var lapLog = new LapLog {
                        Context = context,
                        LapTime = data.lapTimePreviousSelf,
                        TireWear = tireWearDiff,
                        FuelUsage = fuelDiff,
                    };
                    lapDataService.LogLap(lapLog);

                    if (tireWearDataValid && data.tireWearActive >= 1) {
                        lapDataService.LogTireWear(new TireWearLog {
                            Context = context,
                            TireWear = tireWearDiff!,
                        });
                    }

                    if (fuelDataValid && data.fuelUseActive >= 1) {
                        lapDataService.LogFuelUsage(new FuelUsageLog {
                            Context = context,
                            FuelUsage = fuelDiff!.Value,
                        });
                    }
                } else {
                    if (data.tireWearActive >= 1) {
                        lastTireWearDiff = tireWearDiff;
                    }
                    if (data.fuelUseActive >= 1) {
                        lastFuelUsage = fuelDiff;
                    }
                }
            }

            if (data.IsDriving()) {
                recordingData = true;
                lastFuel = fuelNow;
                lastTireWear = tireWearNow;
            }
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
            var emptyData = new R3EExtraData {
                fuelPerLap = 0,
                fuelLastLap = 0,
                tireWearPerLap = new TireWear(),
                tireWearLastLap = new TireWear(),
                averageLapTime = 0,
                bestLapTime = 0,
                estimatedRaceLapCount = 0,
                lapsUntilFinish = 0,

                forceUpdateAll = true,
                rawData = new R3EData {
                    driverData = Array.Empty<DriverData>(),
                },
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            };
            logger.Info("Sending empty data for edit mode");
            await IpcCommunication.Invoke(window, "r3eData", emptyData.Serialize(usedKeys));
        }
    }
}
