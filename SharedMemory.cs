using System.Diagnostics;
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

        private Shared _data;
        private volatile PeriodicTimer dataTimer;
        private volatile MemoryMappedFile? _file;
        private readonly byte[] _buffer;
        private readonly GCHandle _bufferHandle;

        private volatile bool _isRunning = false;
        public bool IsRunning { get => _isRunning; }

        private bool Mapped
        {
            get => _file != null;
        }

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

        public SharedMemory(ProcessObserver raceroomObserver, TimeSpan? refreshRate)
        {
            this.raceroomObserver = raceroomObserver;
            this.raceroomObserver.OnProcessStarted += RaceRoomStarted;
            this.raceroomObserver.OnProcessStopped += RaceRoomStopped;

            _buffer = new byte[SharedSize];
            _bufferHandle = GCHandle.Alloc(_buffer, GCHandleType.Pinned);

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

            var found = false;

            while (!cancellationToken.IsCancellationRequested)
            {
                if (await dataTimer.WaitForNextTickAsync(cancellationToken))
                {
                    if (!Mapped)
                    {
                        if (!found)
                            Startup.logger.Info("Found RRRE.exe, mapping shared memory...");

                        found = true;

                        if (Map())
                        {
                            Startup.logger.Info("Memory mapped successfully");
                        }
                        else
                        {
                            Startup.logger.Warn("Failed to map memory");
                            Thread.Sleep(1000);
                        }
                    }

                    if (Mapped && await Read())
                    {
                        _isRunning = true;
                        OnDataReady?.Invoke(_data);
                    }
                    else
                    {
                        _isRunning = false;
                    }
                }
            }

            Startup.logger.Info("Shared memory worker thread stopped");

            _file = null;
        }

        public void Dispose()
        {
            cancellationTokenSource.Cancel();

            raceroomObserver.OnProcessStarted -= RaceRoomStarted;
            raceroomObserver.OnProcessStopped -= RaceRoomStopped;

            if (_file != null)
                _file.Dispose();

            dataTimer.Dispose();

            _bufferHandle.Free();
        }

        private bool Map()
        {
            try
            {
                _file = MemoryMappedFile.OpenExisting(Constant.sharedMemoryName);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> Read()
        {
            if (_file == null)
                return false;

            try
            {
                using var _view = _file.CreateViewStream();
                await _view.ReadAsync(_buffer, 0, SharedSize);

                var res = Marshal.PtrToStructure(_bufferHandle.AddrOfPinnedObject(), SharedType);
                if (res == null)
                    return false;

                _data = (Shared)res;
                return true;
            }
            catch (Exception e)
            {
                Startup.logger.Error("Error reading shared memory", e);
                return false;
            }
        }
    }
}