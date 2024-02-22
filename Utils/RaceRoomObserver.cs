using ReHUD.Interfaces;

namespace ReHUD.Utils
{
    public class RaceRoomObserver : IRaceRoomObserver, IDisposable
    {
        private static readonly List<string> RaceRoomProcessNames = new() { "RRRE", "RRRE64" };

        private IProcessObserver processObserver;

        public event Action OnProcessStarted;
        public event Action OnProcessStopped;

        public bool IsRunning => processObserver.IsRunning;

        public RaceRoomObserver(IProcessObserverFactory processObserverFactory) {
            this.processObserver = processObserverFactory.GetObserver(RaceRoomProcessNames);

            processObserver.OnProcessStarted += ProcessStarted;
            processObserver.OnProcessStopped += ProcessStopped;
        }

        private void ProcessStarted() => OnProcessStarted?.Invoke();
        private void ProcessStopped() => OnProcessStopped?.Invoke();

        public void Start() => processObserver.Start();

        public void Stop() => processObserver.Stop();

        public void Dispose() {
            processObserver.OnProcessStarted -= ProcessStarted;
            processObserver.OnProcessStopped -= ProcessStopped;

            processObserver.Dispose();
        }
    }
}
