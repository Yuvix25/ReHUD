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

        private readonly ILapDataService lapDataService;
        private readonly IRaceRoomObserver raceRoomObserver;
        private readonly ISharedMemoryService sharedMemoryService;

        private readonly AutoResetEvent resetEvent;
        private CancellationTokenSource cancellationTokenSource = new();

        private volatile bool _isRunning = false;
        public bool IsRunning { get => _isRunning; }

        public R3EExtraData Data { get => extraData; }

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
        private TireWearObj? lastTireWear = null;
        private TireWearObj? lastTireWearDiff = null;
        private volatile int lastLap = -1;

        public R3EDataService(ILapDataService lapDataService, IRaceRoomObserver raceRoomObserver, ISharedMemoryService sharedMemoryService) {
            this.lapDataService = lapDataService;
            this.raceRoomObserver = raceRoomObserver;
            this.sharedMemoryService = sharedMemoryService;

            extraData = new() {
                forceUpdateAll = false
            };

            resetEvent = new AutoResetEvent(false);

            this.raceRoomObserver.OnProcessStarted += RaceRoomStarted;
            this.raceRoomObserver.OnProcessStopped += RaceRoomStopped;

            sharedMemoryService.OnDataReady += OnDataReady;
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

            IDbContextTransaction? multiplierTransaction = null;

            while (!cancellationToken.IsCancellationRequested) {
                resetEvent.WaitOne();
                resetEvent.Reset();

                extraData.timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                if ((data.fuelUseActive > 1 || data.tireWearActive > 1) && multiplierTransaction == null) {
                    multiplierTransaction = lapDataService.BeginTransaction();
                }
                else if (data.fuelUseActive <= 1 && data.tireWearActive <= 1 && multiplierTransaction != null) {
                    await multiplierTransaction.RollbackAsync(cancellationToken);
                    multiplierTransaction.Dispose();
                    multiplierTransaction = null;
                }

                extraData.rawData = data;
                extraData.rawData.numCars = Math.Max(data.numCars, data.position); // Bug in shared memory, sometimes numCars is updated in delay, this partially fixes it
                extraData.rawData.driverData = extraData.rawData.driverData.Take(extraData.rawData.numCars).ToArray();
                if (data.layoutId != -1 && data.vehicleInfo.modelId != -1) {
                    CombinationSummary combination = lapDataService.GetCombinationSummary(data.layoutId, data.vehicleInfo.modelId);
                    extraData.fuelPerLap = combination.AverageFuelUsage;
                    extraData.fuelLastLap = lastFuelUsage;
                    extraData.tireWearPerLap = combination.AverageTireWear;
                    extraData.tireWearLastLap = lastTireWearDiff;
                    extraData.averageLapTime = combination.AverageLapTime;
                    extraData.bestLapTime = combination.BestLapTime;
                    Tuple<int?, double?> lapData = Utilities.GetEstimatedLapCount(data, combination.BestLapTime);
                    extraData.estimatedRaceLapCount = lapData.Item1;
                    extraData.lapsUntilFinish = lapData.Item2;
                }

                if (data.IsNotDriving()) {
                    recordingData = false;
                }

                try {
                    SaveData();
                }
                catch (Exception e) {
                    logger.Error("Error saving data", e);
                    throw;
                }

                if (enteredEditMode) {
                    extraData.forceUpdateAll = true;
                    await IpcCommunication.Invoke(window, "r3eData", extraData.Serialize(usedKeys));
                    extraData.forceUpdateAll = false;
                    enteredEditMode = false;
                }
                else {
                    await IpcCommunication.Invoke(window, "r3eData", extraData.Serialize(usedKeys));
                }

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

                lastLap = data.completedLaps;
            }

            logger.Info("R3EDataService worker thread stopped");
        }

        private static TireWearObj AsTireWear(TireData<float> tireWear) {
            return new TireWearObj {
                FrontLeft = tireWear.frontLeft,
                FrontRight = tireWear.frontRight,
                RearLeft = tireWear.rearLeft,
                RearRight = tireWear.rearRight,
            };
        }

        private void SaveData() {
            if (lastLap == -1 || lastLap == data.completedLaps) {
                return;
            }

            float? fuelNow = data.vehicleInfo.engineType == 1 ? data.batterySoC : data.fuelLeft;
            fuelNow = fuelNow == -1 ? null : fuelNow;
            TireWearObj tireWearNow = AsTireWear(data.tireWear);
            bool lapSaved = false;

            if (recordingData) {
                bool lapValid = data.lapTimePreviousSelf > 0;

                bool tireWearDataValid = lastTireWear != null && tireWearNow != null;
                TireWearObj? tireWearDiff = tireWearDataValid ? tireWearNow! - lastTireWear! : null;

                bool fuelDataValid = lastFuel != null && fuelNow != -1;
                float? fuelDiff = fuelDataValid ? lastFuel - fuelNow : null;

                LapContext context = new(data.layoutId, data.vehicleInfo.modelId, data.vehicleInfo.classPerformanceIndex, data.tireSubtypeFront, data.tireSubtypeRear);

                if (lapValid) {
                    LapData lap = lapDataService.LogLap(context, lapValid, data.lapTimePreviousSelf);
                    lapSaved = true;
                    extraData.lapId = lap.Id;

                    if (tireWearDataValid && data.tireWearActive >= 1) {
                        lapDataService.Log(new TireWear(lap, new TireWearContext(data.tireWearActive), tireWearDiff!));
                    }

                    if (fuelDataValid && data.fuelUseActive >= 1) {
                        lapDataService.Log(new FuelUsage(lap, new FuelUsageContext(data.fuelUseActive), fuelDiff!.Value));
                    }
                }

                if (data.tireWearActive >= 1) {
                    lastTireWearDiff = tireWearDiff;
                }
                if (data.fuelUseActive >= 1) {
                    lastFuelUsage = fuelDiff;
                }
            }

            if (data.IsDriving()) {
                recordingData = true;
                lastFuel = fuelNow;
                lastTireWear = tireWearNow;
            }
            lapDataService.SaveChanges();

            if (!lapSaved) {
                extraData.lapId = null;
            }
        }

        public void SetEnteredEditMode() {
            enteredEditMode = true;
        }

        public void SaveBestLap(int lapId, double[] points, double pointsPerMeter) {
            LapData? lap = lapDataService.GetLap(lapId);
            if (lap == null) {
                logger.WarnFormat("SaveBestLap: lapId={0} not found", lapId);
                return;
            }
            logger.InfoFormat("SaveBestLap: lapId={0}, trackLayoutId={1}, carId={2}, classPerformanceIndex={3}", lapId, lap.Context.TrackLayoutId, lap.Context.CarId, lap.Context.ClassPerformanceIndex);

            // Telemetry telemetry = new() {
            //     Lap = lap,
            //     Value = new() {
            //         Points = points,
            //         PointsPerMeter = pointsPerMeter,
            //     },
            // };
            Telemetry telemetry = new(lap, new(points, pointsPerMeter));
            lapDataService.Log(telemetry);
        }

        public string LoadBestLap(int layoutId, int carId, int classPerformanceIndex) {
            LapData? lap = lapDataService.GetBestLap(layoutId, carId, classPerformanceIndex);
            if (lap == null) {
                return "{}";
            }
            return lap.SerializeForBestLap();
        }

        public async Task SendEmptyData() {
            var emptyData = new R3EExtraData {
                fuelPerLap = 0,
                fuelLastLap = 0,
                tireWearPerLap = new TireWearObj(),
                tireWearLastLap = new TireWearObj(),
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
