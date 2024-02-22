using ElectronNET.API;
using ElectronNET.API.Entities;
using log4net;
using ReHUD.Interfaces;
using System.Net.Http.Headers;
using System.Reflection;

namespace ReHUD.Services
{
    public class UpdateService : IUpdateService
    {
        private static readonly ILog logger = LogManager.GetLogger(MethodBase.GetCurrentMethod()?.DeclaringType);

        private const string githubUrl = "https://github.com/Yuvix25/ReHUD";
        private const string githubReleasesUrl = "releases/latest";

        private string? appVersion;

        public string? AppVersion { get => appVersion; }

        public async Task<string> GetAppVersion() => appVersion ??= await Electron.App.GetVersionAsync();

        public async Task CheckForUpdates() {
            string currentVersion = await GetAppVersion();
            logger.Info("Checking for updates (current version: v" + currentVersion + ")");
            string? remoteUrl = await GetRedirectedUrl(githubUrl + "/" + githubReleasesUrl);
            if (remoteUrl == null) {
                logger.Error("Could not get remote URL for checking updates");
                return;
            }

            string remoteVersionText = remoteUrl.Split('/')[^1];

            Version current = ReHUDVersion.TrimVersion(currentVersion);
            Version remote = ReHUDVersion.TrimVersion(remoteVersionText);

            if (current.CompareTo(remote) < 0) {
                logger.Info("Update available: " + remoteVersionText);

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

    }
}
