namespace ReHUD.Interfaces
{
    public interface IProcessObserver : IDisposable
    {
        public event Action OnProcessStarted;
        public event Action OnProcessStopped;

        public bool IsRunning { get; }

        public void Start();

        public void Stop();
    }
}
