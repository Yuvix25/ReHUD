using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;
using R3E.Data;
using ReHUD;
using PrecisionTiming;

namespace R3E
{
    sealed class SharedMemory : IDisposable
    {
        static readonly int SharedSize = Marshal.SizeOf(typeof(Shared));
        static readonly Type SharedType = typeof(Shared);

        private readonly ProcessObserver raceroomObserver;
        private TimeSpan timeInterval;

        private readonly AutoResetEvent resetEvent;
        private readonly PrecisionTimer dataTimer;

        private CancellationTokenSource cancellationTokenSource = new();

        private Shared? _data;

        private volatile bool _isRunning = false;
        public bool IsRunning { get => _isRunning; }

        public event Func<Shared, Task>? OnDataReady;

        public long FrameRate
        {
            get { return (long)(1000.0 / timeInterval.TotalMilliseconds); }
            set
            {
                timeInterval = TimeSpan.FromMilliseconds(1000.0 / value);
                dataTimer.Stop();
                dataTimer.SetPeriod(timeInterval.Milliseconds);
                dataTimer.Start();
            }
        }

        public Shared? Data { get => _data; }

        public SharedMemory(ProcessObserver raceroomObserver, TimeSpan? refreshRate)
        {
            this.raceroomObserver = raceroomObserver;
            this.raceroomObserver.OnProcessStarted += RaceRoomStarted;
            this.raceroomObserver.OnProcessStopped += RaceRoomStopped;

            resetEvent = new AutoResetEvent(false);
            timeInterval = refreshRate ?? TimeSpan.FromMilliseconds(16.6); // ~60fps
            dataTimer = new();
            dataTimer.SetPeriod(timeInterval.Milliseconds);
            dataTimer.SetAction(() => resetEvent.Set());
        }

        private void RaceRoomStarted()
        {
            Startup.logger.Info($"RaceRoom started, starting shared memory worker");

            cancellationTokenSource.Cancel();
            cancellationTokenSource.Dispose();

            cancellationTokenSource = new();
            Task.Run(() => ProcessSharedMemory(cancellationTokenSource.Token), cancellationTokenSource.Token);
        }

        private void RaceRoomStopped()
        {
            Startup.logger.Info($"RaceRoom stopped, stopping shared memory worker");

            cancellationTokenSource.Cancel();
            _isRunning = false;
        }

        private async Task ProcessSharedMemory(CancellationToken cancellationToken)
        {
            Startup.logger.Info("Starting Shared memory Worker Thread");

            MemoryMappedFile? mmfile = null;
            MemoryMappedViewAccessor? mmview = null;
            Shared? data;

            var found = false;
            dataTimer.Start();
            while (!cancellationToken.IsCancellationRequested)
            {
                resetEvent.WaitOne();
                resetEvent.Reset();
                if (mmview == null)
                {
                    if (!found)
                    {
                        Startup.logger.Info("Found RRRE.exe, mapping shared memory...");
                    }

                    found = true;

                    if (Map(out mmfile, out mmview))
                    {
                        Startup.logger.Info("Memory mapped successfully");
                    }
                    else
                    {
                        Startup.logger.Warn("Failed to map memory, trying again in 1s");
                        Thread.Sleep(1000);
                    }
                }

                data = Read(mmview);
                if (data.HasValue)
                {
                    _isRunning = true;
                    _data = data;
                    var task = OnDataReady?.Invoke(data.Value);
                    if (task != null)
                    {
                        await task;
                    }
                    else
                    {
                        Thread.Sleep(100);
                    }
                }
                else
                {
                    _isRunning = false;
                }
            }
            dataTimer.Stop();

            Startup.logger.Info("Shared memory worker thread stopped");

            mmfile?.Dispose();
            mmview?.Dispose();
        }

        public void Dispose()
        {
            cancellationTokenSource.Cancel();

            raceroomObserver.OnProcessStarted -= RaceRoomStarted;
            raceroomObserver.OnProcessStopped -= RaceRoomStopped;

            dataTimer.Stop();
            dataTimer.Dispose();
            resetEvent.Dispose();
        }

        private static bool Map(out MemoryMappedFile? mmfile, out MemoryMappedViewAccessor? mmview)
        {
            mmfile = null;
            mmview = null;

            try
            {
                mmfile = MemoryMappedFile.OpenExisting(Constant.sharedMemoryName);
                mmview = mmfile.CreateViewAccessor(0, SharedSize);
                return true;
            }
            catch
            {
                mmview?.Dispose();
                mmview = null;

                mmfile?.Dispose();
                mmfile = null;

                return false;
            }
        }

        private static unsafe Shared? Read(MemoryMappedViewAccessor? view)
        {
            if (view == null)
                return null;

            byte* ptr = null;

            try
            {
                view.SafeMemoryMappedViewHandle.AcquirePointer(ref ptr);

                if (ptr == null)
                    return null;

                var res = Marshal.PtrToStructure((IntPtr)ptr, SharedType);
                if (res == null)
                    return null;

                return (Shared)res;
            }
            catch (Exception e)
            {
                Startup.logger.Error("Error reading shared memory", e);
                return null;
            }
            finally
            {
                view.SafeMemoryMappedViewHandle.ReleasePointer();
            }
        }
    }
}