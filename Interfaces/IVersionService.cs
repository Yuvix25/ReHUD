namespace ReHUD.Interfaces
{
    public interface IVersionService : IUserData
    {
        public string? AppVersion { get; }
        public Task<string> GetAppVersion();
        public Task CheckForUpdates();
        public Task Update();
    }
}
