using log4net;
using PrecisionTiming;
using R3E;
using R3E.Data;
using ReHUD.Interfaces;
using System.Diagnostics;
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;

namespace ReHUD.Services
{
    sealed class SharedMemoryService : ISharedMemoryService, IDisposable
    {
        public static readonly ILog logger = LogManager.GetLogger(typeof(SharedMemoryService));

        static readonly int SharedSize = Marshal.SizeOf(typeof(R3EData));
        static readonly Type SharedType = typeof(R3EData);

        private readonly IRaceRoomObserver raceRoomObserver;
        private TimeSpan timeInterval;

        private readonly AutoResetEvent resetEvent;
        private readonly PrecisionTimer dataTimer;

        private CancellationTokenSource cancellationTokenSource = new();

        private R3EData? _data;

        private volatile bool _isRunning = false;
        public bool IsRunning { get => _isRunning; }

        public event Action<R3EData>? OnDataReady;

        public long FrameRate {
            get => (long)(1000.0 / timeInterval.TotalMilliseconds);
            set {
                timeInterval = TimeSpan.FromMilliseconds(1000.0 / value);
                dataTimer.Stop();
                dataTimer.SetPeriod(timeInterval.Milliseconds);
                dataTimer.Start();
            }
        }

        public R3EData? Data { get => _data; }

        public SharedMemoryService(IRaceRoomObserver raceRoomObserver) {
            this.raceRoomObserver = raceRoomObserver;

            this.raceRoomObserver.OnProcessStarted += RaceRoomStarted;
            this.raceRoomObserver.OnProcessStopped += RaceRoomStopped;

            resetEvent = new AutoResetEvent(false);
            timeInterval = TimeSpan.FromMilliseconds(16.6); // ~60fps
            dataTimer = new();

            dataTimer.SetPeriod(timeInterval.Milliseconds);
            dataTimer.SetAction(() => resetEvent.Set());
        }

        private void RaceRoomStarted() {
            logger.Info("RaceRoom started, starting shared memory worker");

            cancellationTokenSource.Cancel();
            cancellationTokenSource.Dispose();

            cancellationTokenSource = new();
            dataTimer.Start();
            Task.Run(() => ProcessSharedMemory(cancellationTokenSource.Token), cancellationTokenSource.Token);
        }

        private void RaceRoomStopped() {
            logger.Info("RaceRoom stopped, stopping shared memory worker");

            cancellationTokenSource.Cancel();
            dataTimer.Stop();
            _isRunning = false;
        }

        private async Task ProcessSharedMemory(CancellationToken cancellationToken) {
            logger.Info("Starting Shared memory Worker Thread");

            MemoryMappedFile? mmfile = null;
            MemoryMappedViewAccessor? mmview = null;
            R3EData? data;

            var found = false;
            while (!cancellationToken.IsCancellationRequested) {
                resetEvent.WaitOne();
                resetEvent.Reset();
                if (mmview == null) {
                    if (!found) {
                        logger.Info("Found RRRE.exe, mapping shared memory...");
                    }

                    found = true;

                    if (Map(out mmfile, out mmview)) {
                        logger.Info("Memory mapped successfully");
                    }
                    else {
                        logger.Warn("Failed to map memory, trying again in 1s");
                        Thread.Sleep(1000);
                    }
                }

                data = Read(mmview);
                if (data.HasValue) {
                    _isRunning = true;
                    _data = data;
                    OnDataReady?.Invoke(data.Value);
                }
                else {
                    _isRunning = false;
                }
            }

            logger.Info("Stopped shared memory worker thread");

            mmfile?.Dispose();
            mmview?.Dispose();
        }

        public void Dispose() {
            cancellationTokenSource.Cancel();

            raceRoomObserver.OnProcessStarted -= RaceRoomStarted;
            raceRoomObserver.OnProcessStopped -= RaceRoomStopped;

            dataTimer.Stop();
            dataTimer.Dispose();
            resetEvent.Dispose();
        }

        private static bool Map(out MemoryMappedFile? mmfile, out MemoryMappedViewAccessor? mmview) {
            mmfile = null;
            mmview = null;

            try {
                mmfile = MemoryMappedFile.OpenExisting(Constant.sharedMemoryName);
                mmview = mmfile.CreateViewAccessor(0, SharedSize);
                return true;
            }
            catch {
                mmview?.Dispose();
                mmview = null;

                mmfile?.Dispose();
                mmfile = null;

                return false;
            }
        }

        private static unsafe R3EData? Read(MemoryMappedViewAccessor? view) {
            if (view == null)
                return null;

            byte* ptr = null;

            try {
                view.SafeMemoryMappedViewHandle.AcquirePointer(ref ptr);

                if (ptr == null)
                    return null;

                var res = Marshal.PtrToStructure((IntPtr)ptr, SharedType);
                if (res == null)
                    return null;

                return (R3EData)res;
            }
            catch (Exception e) {
                logger.Error("Error reading shared memory", e);
                return null;
            }
            finally {
                view.SafeMemoryMappedViewHandle.ReleasePointer();
            }
        }
    }
}