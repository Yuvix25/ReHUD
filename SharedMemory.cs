using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;
using R3E.Data;
using ReHUD;

namespace R3E
{
    class SharedMemory : IDisposable
    {
        static readonly int SharedSize = Marshal.SizeOf(typeof(Shared));
        static readonly Type SharedType = typeof(Shared);

        private readonly ProcessObserver raceroomObserver;
        private TimeSpan timeInterval;

        private CancellationTokenSource cancellationTokenSource = new();

        private Shared? _data;
        private volatile PeriodicTimer dataTimer;

        private volatile bool _isRunning = false;
        public bool IsRunning { get => _isRunning; }

        public event Action<Shared> OnDataReady;

        public long FrameRate
        {
            get { return (long)(1000.0 / timeInterval.TotalMilliseconds); }
            set
            {
                timeInterval = TimeSpan.FromMilliseconds(1000.0 / value);
                dataTimer.Dispose();
                dataTimer = new(timeInterval);
            }
        }

        public Shared? Data { get => _data; }

        public SharedMemory(ProcessObserver raceroomObserver, TimeSpan? refreshRate)
        {
            this.raceroomObserver = raceroomObserver;
            this.raceroomObserver.OnProcessStarted += RaceRoomStarted;
            this.raceroomObserver.OnProcessStopped += RaceRoomStopped;

            timeInterval = refreshRate ?? TimeSpan.FromMilliseconds(16.6); // ~60fps
            dataTimer = new(timeInterval);
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

            while (!cancellationToken.IsCancellationRequested)
            {
                if (await dataTimer.WaitForNextTickAsync(cancellationToken))
                {
                    if (mmview == null)
                    {
                        if (!found)
                            Startup.logger.Info("Found RRRE.exe, mapping shared memory...");

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

                    if ((data = Read(mmview)).HasValue)
                    {
                        _isRunning = true;
                        _data = data;
                        OnDataReady?.Invoke(data.Value);

                    }
                    else
                    {
                        _isRunning = false;
                    }
                }
            }

            Startup.logger.Info("Shared memory worker thread stopped");

            mmfile?.Dispose();
            mmview?.Dispose();
        }

        public void Dispose()
        {
            cancellationTokenSource.Cancel();

            raceroomObserver.OnProcessStarted -= RaceRoomStarted;
            raceroomObserver.OnProcessStopped -= RaceRoomStopped;

            dataTimer.Dispose();
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