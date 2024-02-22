namespace ReHUD.Interfaces
{
    public interface IProcessObserverFactory
    {
        IProcessObserver GetObserver(string processName);
        IProcessObserver GetObserver(List<string> processNames);
    }
}
