using System.Net.Http.Headers;
using System.Reflection;
using ElectronNET.API;
using ElectronNET.API.Entities;
using log4net;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ReHUD.Interfaces;
using ReHUD.Models;
using ReHUD.UpgradeActions;

namespace ReHUD.Services;

public class VersionService : UserData, IDisposable, IVersionService
{
    private static readonly ILog logger = LogManager.GetLogger(typeof(VersionService));

    private const string githubUrl = "https://github.com/Yuvix25/ReHUD";
    private const string githubReleasesUrl = "releases/latest";

    private string? appVersion;

    public string? AppVersion { get => appVersion; }

    public async Task<string> GetAppVersion() => appVersion ??= await Electron.App.GetVersionAsync();

    protected override string? DEFAULT_WHEN_EMPTY => null;
    public static readonly Version DEFAULT_VERSION = Version.Parse("0.0.0");
    protected override string DataFilePath => "ReHUD.version";
    private Version version = DEFAULT_VERSION;


    public VersionService() { }

    public void Dispose() {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing) {
        if (disposing) {
        }
    }

    public override string Serialize() {
        return version.ToString();
    }

    protected override void Load(string? data) {
        version = TrimVersion(data);
    }

    public async Task CheckForUpdates() {
        string currentVersion = await GetAppVersion();
        logger.InfoFormat("Checking for updates (current version: v{0})", currentVersion);
        string? remoteUrl = await GetRedirectedUrl(githubUrl + "/" + githubReleasesUrl);
        if (remoteUrl == null) {
            logger.Error("Could not get remote URL for checking updates");
            return;
        }

        string remoteVersionText = remoteUrl.Split('/')[^1];

        Version current = TrimVersion(currentVersion);
        Version remote = TrimVersion(remoteVersionText);

        if (current.CompareTo(remote) < 0) {
            logger.InfoFormat("Update available: {0}", remoteVersionText);

            await Startup.ShowMessageBox("A new version is available: " + remoteVersionText, new string[] { "Show me", "Cancel" }, "Update available", MessageBoxType.info).ContinueWith((t) => {
                if (t.Result.Response == 0) {
                    Electron.Shell.OpenExternalAsync(remoteUrl);
                }
            });

            return;
        }
        logger.Info("No updates available");
    }

    private static async Task<string?> GetRedirectedUrl(string url) {
        //this allows you to set the settings so that we can get the redirect url
        var handler = new HttpClientHandler() {
            AllowAutoRedirect = false
        };
        string? redirectedUrl = null;

        using (HttpClient client = new(handler))
        using (HttpResponseMessage response = await client.GetAsync(url))
        using (HttpContent content = response.Content) {
            // ... Read the response to see if we have the redirected url
            if (response.StatusCode == System.Net.HttpStatusCode.Found) {
                HttpResponseHeaders headers = response.Headers;
                if (headers != null && headers.Location != null) {
                    redirectedUrl = headers.Location.AbsoluteUri;
                }
            }
        }

        return redirectedUrl;
    }

    private static IEnumerable<UpgradeAction> GetAllUpgradeActions(Version oldVersion) {
        return (new UpgradeAction[] {
            new MoveHudLayoutToSeparateFile(oldVersion),
            new MoveDataFromJsonToSQLite(oldVersion),
        }).OrderBy(action => action.ToVersion).ToArray();
    }

    private static IEnumerable<UpgradeAction> GetRelevantUpgradeActions(Version oldVersion, Version newVersion) {
        return GetAllUpgradeActions(oldVersion).Where(action => action.ToVersion.CompareTo(oldVersion) > 0 && action.ToVersion.CompareTo(newVersion) <= 0).ToArray();
    }

    public async Task Update() {
        var newVersion = TrimVersion(await GetAppVersion());
        var compare = newVersion.CompareTo(version);
        if (compare == 0) return;
        if (compare < 0) {
            await Startup.QuitApp($"Cannot downgrade ReHUD version.\nIf you wish to downgrade, please remove your '{IUserData.dataPath}' folder first.\nThis will reset all settings and saved user data, such as fuel consumption, tire wear and laptimes.");
            return;
        }

        OnVersionChanged(version, newVersion);

        version = newVersion;
        Save();
    }

    private static void OnVersionChanged(Version previousVersion, Version version) {
        Startup.logger.InfoFormat("Upgrading ReHUD from v{0} to v{1}", previousVersion, version);

        foreach (var action in GetRelevantUpgradeActions(previousVersion, version)) {
            Startup.logger.InfoFormat("Running upgrade action v{0}: {1}", action.ToVersion, action.Description);
            action.Upgrade();
        }
    }

    [AttributeUsage(AttributeTargets.Method)]
    private class UpgradeActionAttribute : Attribute {
        public UpgradeActionAttribute(string version, string name) {
            Version = Version.Parse(version);
            Name = name;
        }

        public Version Version { get; }
        public string Name { get; }
    }

    public static Version TrimVersion(string? version) {
        if (version == null) return DEFAULT_VERSION;
        return Version.Parse(version.Split('v')[^1].Split('-')[0]);
    }
}