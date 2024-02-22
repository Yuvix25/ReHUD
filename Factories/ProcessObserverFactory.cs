using ReHUD.Interfaces;
using ReHUD.Utils;

namespace ReHUD.Factories
{
    public class ProcessObserverFactory : IProcessObserverFactory
    {
        public IProcessObserver GetObserver(string processName) => new ProcessObserver(new() { processName });

        public IProcessObserver GetObserver(List<string> processNames) => new ProcessObserver(processNames);
    }
}
