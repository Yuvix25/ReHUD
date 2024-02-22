using log4net;
using ReHUD.Interfaces;
using System.Diagnostics;
using System.Management;

namespace ReHUD.Utils
{
    public class ProcessObserver : IProcessObserver, IDisposable
    {
        public static readonly ILog logger = LogManager.GetLogger(typeof(ProcessObserver));

        private readonly List<string> processNames;
        private readonly ManagementEventWatcher startWatcher;
        private readonly ManagementEventWatcher stopWatcher;

        public event Action OnProcessStarted;
        public event Action OnProcessStopped;

        public bool IsRunning { get => processNames.Any(processName => Process.GetProcessesByName(processName).Length > 0); }

        public ProcessObserver(List<string> processNames) {
            logger.Info($"Creating process observer for {processNames.Count} process names: {string.Join(", ", processNames)}");

            this.processNames = processNames;

            var processNamePredicate = string.Join(" OR ", processNames.Select(processName => $"TargetInstance.Name = '{processName}.exe'"));

            startWatcher = new ManagementEventWatcher(new WqlEventQuery($"SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Process' AND ({processNamePredicate})"));
            startWatcher.EventArrived += ProcessStarted;

            stopWatcher = new ManagementEventWatcher(new WqlEventQuery("SELECT * FROM __InstanceDeletionEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Process' AND (TargetInstance.Name = 'RRRE.exe' OR TargetInstance.Name = 'RRRE64.exe')"));
            stopWatcher.EventArrived += ProcessStopped;
        }

        private void ProcessStarted(object sender, EventArrivedEventArgs e) {
            logger.Info($"Got process start event for processes: {string.Join(", ", processNames)}");
            OnProcessStarted?.Invoke();
        }
        private void ProcessStopped(object sender, EventArrivedEventArgs e) {
            logger.Info($"Got process stop event for processes: {string.Join(", ", processNames)}");
            OnProcessStopped?.Invoke();
        }

        public void Start() {
            logger.Info("Start Called on Process Observer");

            startWatcher.Start();
            stopWatcher.Start();

            if (IsRunning) {
                logger.Info("Process is already running when Start called, emitting OnProcessStarted event");
                OnProcessStarted?.Invoke();
            }
            else {
                logger.Info("Process is not yet running when Start called, waiting for WMI event");
            }
        }

        public void Stop() {
            logger.Info("Stop Called on Process Observer");

            startWatcher.Stop();
            stopWatcher.Stop();
        }

        public void Dispose() {
            logger.Info("Disposing Process Observer");

            startWatcher.Stop();
            stopWatcher.Stop();

            startWatcher.Dispose();
            stopWatcher.Dispose();
        }
    }
}
