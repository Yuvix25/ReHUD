namespace ReHUD.Interfaces
{
    public interface IUpdateService
    {
        public string? AppVersion { get; }
        public Task<string> GetAppVersion();
        public Task CheckForUpdates();
    }
}
