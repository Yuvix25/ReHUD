using ElectronNET.API;
using ElectronNET.API.Entities;
using log4net;
using R3E;
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

        private readonly IEventService eventService;
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

        private bool enteredEditMode = false;
        private bool recordingData = false;
        private bool lapValid = false;
        private DateTime lastLapInvalidation = DateTime.MinValue;
        private float? lastFuel = null;
        private float? lastFuelUsage = null;
        private TireWearObj? lastTireWear = null;
        private TireWearObj? lastTireWearDiff = null;
        private int? lastLapNum = null;

        public R3EDataService(IEventService eventService, IRaceRoomObserver raceRoomObserver, ISharedMemoryService sharedMemoryService) {
            this.eventService = eventService;
            this.lapDataService = new LapDataService();
            this.raceRoomObserver = raceRoomObserver;
            this.sharedMemoryService = sharedMemoryService;

            extraData = new() {
                forceUpdateAll = false
            };

            resetEvent = new AutoResetEvent(false);

            this.raceRoomObserver.OnProcessStarted += RaceRoomStarted;
            this.raceRoomObserver.OnProcessStopped += RaceRoomStopped;

            this.sharedMemoryService.OnDataReady += OnDataReady;
            this.eventService.NewLap += SaveData;
            this.eventService.PositionJump += (sender, e) => InvalidateLap();
            this.eventService.SessionChange += (sender, e) => InvalidateLap();
            this.eventService.EnterReplay += (sender, e) => InvalidateLap();
            this.eventService.ExitReplay += (sender, e) => InvalidateLap();
            this.eventService.EnterPitlane += (sender, e) => InvalidateLap();
            this.eventService.ExitPitlane += (sender, e) => InvalidateLap();
            this.eventService.MainDriverChange += (sender, e) => InvalidateLap();
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


        private void SetRecordingData() {
            if (!recordingData) {
                logger.Info("Recording data");
                recordingData = true;
            }
        }

        private void ResetRecordingData() {
            if (recordingData) {
                logger.Info("Stopped recording data");
                recordingData = false;
                lapValid = false;
            }
        }


        private void ForceSetLapValid() {
            if (!lapValid) {
                logger.Info("Setting lap valid");
                lapValid = true;
            }
        }

        private void GraceSetLapValid() {
            if (DateTime.UtcNow - lastLapInvalidation < TimeSpan.FromSeconds(5)) {
                ForceSetLapValid();
            }
        }

        private void ResetLapValid() {
            if (lapValid) {
                logger.Info("Setting lap invalid");
                lapValid = false;
                lastLapInvalidation = DateTime.UtcNow;
            }
        }

        private void InvalidateLap() {
            ResetRecordingData();
            ResetLapValid();
        }

        public static readonly TimeSpan UPDATE_COMBINATION_SUMMARY_EVERY = TimeSpan.FromMilliseconds(300);

        private async Task ProcessR3EData(CancellationToken cancellationToken) {
            logger.Info("Starting R3EDataService worker");

            var lastCombinationSummaryUpdate = DateTime.UtcNow - TimeSpan.FromMinutes(1);
            while (!cancellationToken.IsCancellationRequested) {
                resetEvent.WaitOne();
                resetEvent.Reset();

                extraData.timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();


                var dataClone = data; // Clone the struct to avoid collisions with the shared memory service.

                // Bug in shared memory, sometimes numCars is updated in delay, this partially fixes it.
                dataClone.numCars = Math.Max(dataClone.numCars, dataClone.position);
                var firstEmptyIndex = Array.FindIndex(dataClone.driverData, d => d.driverInfo.slotId == -1);
                if (firstEmptyIndex != -1) {
                    dataClone.numCars = Math.Min(dataClone.numCars, firstEmptyIndex);
                }
                dataClone.driverData = dataClone.driverData.Take(dataClone.numCars).ToArray();
                var utcNow = DateTime.UtcNow;
                if (dataClone.layoutId != -1 && dataClone.vehicleInfo.modelId != -1 && utcNow - lastCombinationSummaryUpdate > UPDATE_COMBINATION_SUMMARY_EVERY) {
                    var tireSubtypeFront = (Constant.TireSubtype)dataClone.tireSubtypeFront;
                    var tireSubtypeRear = (Constant.TireSubtype)dataClone.tireSubtypeRear;
                    lastCombinationSummaryUpdate = utcNow;
                    CombinationSummary combination = lapDataService.GetCombinationSummary(dataClone.layoutId, dataClone.vehicleInfo.modelId, tireSubtypeFront, tireSubtypeRear);
                    extraData.fuelPerLap = combination.AverageFuelUsage;
                    extraData.fuelLastLap = lastFuelUsage;
                    extraData.tireWearPerLap = combination.AverageTireWear;
                    extraData.tireWearLastLap = lastTireWearDiff;
                    extraData.averageLapTime = combination.AverageLapTime;
                    extraData.bestLapTime = combination.BestLapTime;
                    Tuple<int?, double?> lapData = Utilities.GetEstimatedLapCount(dataClone, combination.BestLapTime);
                    extraData.estimatedRaceLapCount = lapData.Item1;
                    extraData.lapsUntilFinish = lapData.Item2;
                    var bestLap = lapDataService.GetCarBestLap(dataClone.layoutId, dataClone.vehicleInfo.modelId, tireSubtypeFront, tireSubtypeRear);
                    if (bestLap == null) {
                        extraData.allTimeBestLapTime = null;
                    } else {
                        extraData.allTimeBestLapTime = bestLap.LapTime.Value;
                    }
                }
                extraData.rawData = dataClone;

                if (recordingData && (dataClone.gameInReplay == 1 || dataClone.inPitlane == 1)) {
                    ResetRecordingData();
                }

                if (data.currentLapValid == 0) {
                    ResetLapValid();
                } else {
                    // currentLapValid is sometimes updated after the new lap event, so we need to be able to re-validate it.
                    GraceSetLapValid();
                }

                try {
                    extraData.events = eventService.Cycle(dataClone);
                } catch (Exception e) {
                    logger.Error("Error in event cycle", e);
                }


                if (window != null) {
                    if (enteredEditMode) {
                        extraData.forceUpdateAll = true;
                        await IpcCommunication.Invoke(window, "r3eData", extraData.Serialize(usedKeys));
                        extraData.forceUpdateAll = false;
                        enteredEditMode = false;
                    }
                    else {
                        await IpcCommunication.Invoke(window, "r3eData", extraData.Serialize(usedKeys));
                    }
                }

                if (dataClone.IsInMenus()) {
                    if (window != null && (hudShown ?? true)) {
                        Electron.IpcMain.Send(window, "hide");
                        hudShown = false;
                    }

                    if (dataClone.sessionType == -1) {
                        lastLapNum = null;
                        lastFuel = null;
                        lastTireWear = null;
                    }
                } else if (window != null && !(hudShown ?? false)) {
                    Electron.IpcMain.Send(window, "show");
                    window.SetAlwaysOnTop(!Startup.IsInVrMode, OnTopLevel.screenSaver);
                    hudShown = true;
                }

                lastLapNum = dataClone.completedLaps;
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

        private void SaveData(object? sender, DriverEventArgs args) {
            if (!args.IsMainDriver) {
                return;
            }

            float? fuelNow = data.vehicleInfo.engineType == 1 ? data.batterySoC : data.fuelLeft;
            fuelNow = fuelNow == -1 ? null : fuelNow;
            TireWearObj tireWearNow = AsTireWear(data.tireWear);
            bool lapSaved = false;

            try {
                if (recordingData) {
                    bool tireWearDataValid = lastTireWear != null && tireWearNow != null;
                    TireWearObj? tireWearDiff = tireWearDataValid ? lastTireWear! - tireWearNow! : null;

                    bool fuelDataValid = lastFuel != null && fuelNow != -1;
                    float? fuelDiff = fuelDataValid ? lastFuel - fuelNow : null;

                    if (lapValid) {
                        LapContext context = new(data.layoutId, data.vehicleInfo.modelId, data.vehicleInfo.classPerformanceIndex, data.tireSubtypeFront, data.tireSubtypeRear);

                        bool usingEstimatedLapTime = (lastLapNum == data.completedLaps || data.lapTimePreviousSelf < 0) && data.lapTimeCurrentSelf > 0;
                        double? lapTime = null;
                        if (usingEstimatedLapTime) {
                            lapTime = data.lapTimeCurrentSelf;
                            logger.DebugFormat("Game did not update laptime yet (currently set to {0}), using estimated laptime {1}", data.lapTimePreviousSelf, lapTime);
                        } else if (data.lapTimePreviousSelf > 0) {
                            lapTime = data.lapTimePreviousSelf;
                        }

                        if (lapTime != null) {
                            var savedTransaction = false;
                            var transaction = lapDataService.BeginTransaction();
                            try {
                                LapData lap = lapDataService.LogLap(context, lapValid, lapTime.Value);
                                lapSaved = true;
                                extraData.lapId = lap.Id;
                                extraData.lastLapTime = lapTime;

                                if (tireWearDataValid && data.tireWearActive >= 1) {
                                    lapDataService.Log(new TireWear(lap, tireWearDiff!, new TireWearContext(data.tireWearActive)));
                                }

                                if (fuelDataValid && data.fuelUseActive >= 1) {
                                    lapDataService.Log(new FuelUsage(lap, fuelDiff!.Value, new FuelUsageContext(data.fuelUseActive)));
                                }

                                // Commit async to not block the thread.
                                // This is safe because this method is only called when a lap is completed, so there's plenty of time between calls.
                                // TODO: Maybe move this to a separate thread with a queue?
                                transaction.CommitAsync();
                                savedTransaction = true;

                                if (usingEstimatedLapTime) {
                                    logger.Info("Waiting for laptime value from the game");
                                    
                                    // Wait for laptime value from the game in new thread with 2 seconds timeout.
                                    var lastLap = data.completedLaps;
                                    Task.Run(() => {
                                        var innerLapDataService = new LapDataService(); // Create a new one because we're in a different thread.

                                        var startTime = DateTime.UtcNow;
                                        while (DateTime.UtcNow - startTime < TimeSpan.FromSeconds(5)) {
                                            if (data.completedLaps > lastLap) {
                                                if (data.lapTimePreviousSelf > 0) {
                                                    innerLapDataService.UpdateLapTime(lap, data.lapTimePreviousSelf);
                                                }
                                                break;
                                            }
                                            Thread.Sleep(100);
                                        }
                                    });
                                }
                            } catch (Exception e) {
                                logger.Error("Error saving lap", e);
                            } finally {
                                if (!savedTransaction) {
                                    transaction.Rollback();
                                }
                                transaction.Dispose();
                            }
                        } else {
                            logger.Error("No valid laptime found, not saving lap");
                            extraData.lapId = null;
                        }
                    } else {
                        logger.Info("Lap not valid, not saving lap");
                    }

                    if (data.tireWearActive >= 1) {
                        lastTireWearDiff = tireWearDiff;
                    }
                    if (data.fuelUseActive >= 1) {
                        lastFuelUsage = fuelDiff;
                    }
                }
            } finally {
                if (data.IsDriving()) {
                    // First race lap should not be saved because it starts from the grid.
                    if (data.sessionType != (int)Constant.Session.Race || data.completedLaps > 0) {
                        SetRecordingData();
                    }
                    ForceSetLapValid();
                    lastFuel = fuelNow;
                    lastTireWear = tireWearNow;
                }

                if (!lapSaved) {
                    extraData.lapId = null;
                }
            }
        }

        public void SetEnteredEditMode() {
            enteredEditMode = true;
        }

        public void SaveBestLap(int lapId, double[] points, double pointsPerMeter) {
            var innerLapDataService = new LapDataService(); // Create a new one because we're in a different thread
            LapData? lap = innerLapDataService.GetLap(lapId);
            if (lap == null) {
                logger.WarnFormat("SaveBestLap: lapId={0} not found", lapId);
                return;
            }
            logger.InfoFormat("SaveBestLap: lapId={0}, trackLayoutId={1}, carId={2}, classPerformanceIndex={3}", lapId, lap.Context.TrackLayoutId, lap.Context.CarId, lap.Context.ClassPerformanceIndex);

            Telemetry telemetry = new(lap, new(points, pointsPerMeter));
            innerLapDataService.Log(telemetry);
        }

        public string LoadBestLap() {
            var layoutId = data.layoutId;
            var carId = data.vehicleInfo.modelId;
            var classPerformanceIndex = data.vehicleInfo.classPerformanceIndex;
            var tireSubtypeFront = (Constant.TireSubtype)data.tireSubtypeFront;
            var tireSubtypeRear = (Constant.TireSubtype)data.tireSubtypeRear;

            var innerLapDataService = new LapDataService(); // Create a new one because we're in a different thread
            LapData? lap = innerLapDataService.GetClassBestLap(layoutId, carId, classPerformanceIndex, tireSubtypeFront, tireSubtypeRear);
            if (lap == null) {
                return "{}";
            }
            return lap.SerializeForBestLap();
        }

        public async Task SendEmptyData() {
            logger.Info("Sending empty data for edit mode");
            var emptyData = R3EExtraData.NewEmpty();
            await IpcCommunication.Invoke(window, "r3eData", emptyData.Serialize(usedKeys));
        }
    }
}
