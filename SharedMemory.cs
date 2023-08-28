using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;
using R3E.Data;

namespace R3E
{
    internal delegate void SharedMemoryCallback(Shared data);

    class SharedMemory : IDisposable
    {
        private bool found = false;
        private bool Mapped
        {
            get { return (_file != null); }
        }

        private Shared _data;
        private MemoryMappedFile? _file;
        private byte[]? _buffer;
        public static readonly TimeSpan timeInterval = TimeSpan.FromMilliseconds(17); // ~60fps

        public void Dispose()
        {
            if (_file != null)
                _file.Dispose();
        }

        public static bool isRunning = false;

        public void Run(SharedMemoryCallback callback)
        {
            var timeReset = DateTime.UtcNow;
            var timeLast = timeReset;

            ReHUD.Startup.logger.Info("Looking for RRRE.exe...");

            while (true)
            {
                var timeNow = DateTime.UtcNow;

                if (timeNow.Subtract(timeLast) < timeInterval)
                {
                    Thread.Sleep(1);
                    continue;
                }

                timeLast = timeNow;

                if (Utilities.IsRaceRoomRunning() && !Mapped)
                {
                    if (!found)
                        ReHUD.Startup.logger.Info("Found RRRE.exe, mapping shared memory...");

                    found = true;

                    if (Map())
                    {
                        ReHUD.Startup.logger.Info("Memory mapped successfully");
                        timeReset = DateTime.UtcNow;

                        _buffer = new Byte[Marshal.SizeOf(typeof(Shared))];
                    }
                }

                if (Mapped && Read())
                {
                    isRunning = true;
                    callback(_data);
                }
                else
                {
                    isRunning = false;
                }
            }
        }

        private bool Map()
        {
            try
            {
                _file = MemoryMappedFile.OpenExisting(Constant.SharedMemoryName);
                return true;
            }
            catch (FileNotFoundException e)
            {
                // ReHUD.Startup.logger.Error("Error mapping shared memory", e);
                return false;
            }
        }

        private bool Read()
        {
            if (_file == null)
                return false;

            try
            {
                var _view = _file.CreateViewStream();
                BinaryReader _stream = new BinaryReader(_view);
                _buffer = _stream.ReadBytes(Marshal.SizeOf(typeof(Shared)));
                GCHandle _handle = GCHandle.Alloc(_buffer, GCHandleType.Pinned);

                var res = Marshal.PtrToStructure(_handle.AddrOfPinnedObject(), typeof(Shared));
                if (res == null)
                    return false;

                _data = (Shared)res;
                _handle.Free();

                return true;
            }
            catch (Exception e)
            {
                ReHUD.Startup.logger.Error("Error reading shared memory", e);
                return false;
            }
        }
    }
}