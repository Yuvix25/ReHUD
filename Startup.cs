using ElectronNET.API;
using ElectronNET.API.Entities;
using Newtonsoft.Json;
using log4net;
using log4net.Appender;
using log4net.Repository.Hierarchy;
using log4net.Config;
using System.Reflection;
using System.Net.Http.Headers;
using R3E;

namespace ReHUD;

public class Startup
{
    public static readonly ILog logger = LogManager.GetLogger(MethodBase.GetCurrentMethod()?.DeclaringType);
    FileAppender? rootAppender;
    string? logFilePath;

    public Startup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    // This method gets called by the runtime. Use this method to add services to the container.
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddRazorPages();
    }

    // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        var logRepository = LogManager.GetRepository(Assembly.GetEntryAssembly());
        XmlConfigurator.Configure(logRepository, new FileInfo("log4net.config"));

        rootAppender = ((Hierarchy)logRepository).Root.Appenders.OfType<FileAppender>().FirstOrDefault();
        logFilePath = rootAppender != null ? rootAppender.File : string.Empty;

        lapPointsData.Load();

        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }
        else
        {
            app.UseExceptionHandler("/Error");
            app.UseHsts();
        }

        app.UseHttpsRedirection();
        app.UseStaticFiles();

        app.UseRouting();

        app.UseAuthorization();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapRazorPages();
        });

        Electron.App.CommandLine.AppendSwitch("enable-transparent-visuals");
        Electron.App.CommandLine.AppendSwitch("disable-gpu-compositing");

        if (HybridSupport.IsElectronActive)
        {
            Electron.App.Ready += async () =>
            {
                try
                {
                    await CreateMainWindow(env);
                    await CreateSettingsWindow(env);
                }
                catch (Exception e)
                {
                    logger.Error("Error creating windows", e);
                }
            };
        }
    }


    private BrowserWindow? mainWindow;
    private BrowserWindow? settingsWindow;

    private const string githubUrl = "https://github.com/Yuvix25/ReHUD";
    private const string githubReleasesUrl = "releases/latest";
    private const string anotherInstanceMessage = "Another instance of ReHUD is already running";
    private const string logFilePathWarning = "Log file path could not be determined. Try searching for a file named 'ReHUD.log' in C:\\Users\\<username>\\AppData\\Local\\Programs\\rehud\\resources\\bin";

    private readonly FuelData fuelData = new();
    private readonly LapPointsData lapPointsData = new();
    private readonly Settings settings = new();

    private static async Task<BrowserWindow> CreateWindowAsync(BrowserWindowOptions options, string loadUrl = "/")
    {
        loadUrl = "http://localhost:" + BridgeSettings.WebPort + loadUrl;
        return await Electron.WindowManager.CreateWindowAsync(options, loadUrl);
    }

    private async Task CreateMainWindow(IWebHostEnvironment env)
    {
        mainWindow = await CreateWindowAsync(new BrowserWindowOptions()
        {
            Resizable = false,
            Fullscreen = true,
            Minimizable = false,
            Movable = false,
            Frame = false,
            Transparent = true,
            BackgroundColor = "#00000000",
            Icon = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "ReHUD.png"),
            WebPreferences = new WebPreferences()
            {
                EnableRemoteModule = true,
                NodeIntegration = true,
            },
        }, loadUrl: "/Index");

        bool gotLock = await Electron.App.RequestSingleInstanceLockAsync((args, arg) => { });
        if (!gotLock)
        {
            await ShowMessageBox(mainWindow, anotherInstanceMessage, "Error", MessageBoxType.error);
            Electron.App.Quit();
            return;
        }

        mainWindow.SetAlwaysOnTop(true, OnTopLevel.screenSaver);

        if (!env.IsDevelopment())
            mainWindow.SetIgnoreMouseEvents(true);


        await Electron.IpcMain.On("log", (args) =>
        {
            Newtonsoft.Json.Linq.JObject obj = (Newtonsoft.Json.Linq.JObject)args;
            if (obj == null || obj["level"] == null)
                return;
            string message = ((string?)obj["message"] ?? "(unknown)").Trim();
            string level = ((string?)obj["level"] ?? "INFO").ToUpper();

            switch (level)
            {
                case "INFO":
                    logger.Info(message);
                    break;
                case "WARN":
                    logger.Warn(message);
                    break;
                case "ERROR":
                    logger.Error(message);
                    break;
            }
        });


        await Electron.IpcMain.On("get-hud-layout", (args) =>
        {
            SendHudLayout(mainWindow);
        });

        await Electron.IpcMain.On("set-hud-layout", (args) =>
        {
            SetHudLayout(JsonConvert.DeserializeObject<object>(args.ToString() ?? "{}") ?? new Dictionary<string, object>());
        });

        await Electron.IpcMain.On("toggle-element", (args) =>
        {
            Newtonsoft.Json.Linq.JArray array = (Newtonsoft.Json.Linq.JArray)args;
            string? elementId = (string?)array[0];
            bool shown = (bool)array[1];

            if (elementId == null)
                return;

            Electron.IpcMain.Send(mainWindow, "toggle-element", elementId, shown);
        });

        await Electron.IpcMain.On("reset-hud-layout", (args) =>
        {
            try
            {
                SendHudLayout(mainWindow, new Dictionary<string, object>());
            }
            catch (Exception e)
            {
                logger.Error("Error resetting HUD layout", e);
            }
        });

        await Electron.IpcMain.On("request-layout-visibility", (args) =>
        {
            isShown = null;
        });

        await Electron.IpcMain.On("save-best-lap", (args) =>
        {
            Newtonsoft.Json.Linq.JArray array = (Newtonsoft.Json.Linq.JArray)args;
            int layoutId = (int)array[0];
            int classId = (int)array[1];
            double laptime = (double)array[2];
            double[] points = ((Newtonsoft.Json.Linq.JArray)array[3]).Select(x => (double)x).ToArray();
            double pointsPerMeter = (double)array[4];

            LapPointsCombination combination = lapPointsData.GetCombination(layoutId, classId);
            combination.Set(laptime, points, pointsPerMeter);

            lapPointsData.Save();
        });

        await Electron.IpcMain.On("load-best-lap", (args) =>
        {
            Newtonsoft.Json.Linq.JArray array = (Newtonsoft.Json.Linq.JArray)args;
            int layoutId = (int)array[0];
            int classId = (int)array[1];

            LapPointsCombination? combination = lapPointsData.GetCombination(layoutId, classId, false);
            if (combination == null)
                return;
            Electron.IpcMain.Send(mainWindow, "load-best-lap", combination.Serialize());
        });

        RunLoop(mainWindow, env);

        mainWindow.OnClosed += () => Electron.App.Quit();
    }

    private void SendHudLayout(BrowserWindow window)
    {
        SendHudLayout(window, GetHudLayout());
    }

    private void SendHudLayout(BrowserWindow window, object layout)
    {
        Electron.IpcMain.Send(window, "hud-layout", JsonConvert.SerializeObject(layout));
        if (settingsWindow != null)
            Electron.IpcMain.Send(settingsWindow, "hud-layout", JsonConvert.SerializeObject(layout));
    }


    private async void InitSettingsWindow()
    {
        Electron.IpcMain.Send(mainWindow, "settings", settings.Serialize());
        Electron.IpcMain.Send(settingsWindow, "settings", settings.Serialize());
        Electron.IpcMain.Send(settingsWindow, "version", await AppVersion());
    }


    bool enteredEditMode = false;

    private async Task CreateSettingsWindow(IWebHostEnvironment env)
    {
        settingsWindow = await CreateWindowAsync(new BrowserWindowOptions()
        {
            Width = 800,
            Height = 600,
            Icon = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "ReHUD.png"),
            WebPreferences = new WebPreferences()
            {
                EnableRemoteModule = true,
                NodeIntegration = true,
            },
        }, loadUrl: "/Settings");

        settingsWindow.Minimize();

        if (!env.IsDevelopment())
            settingsWindow.RemoveMenu();

        await Electron.IpcMain.On("load-settings", (data) =>
        {
            InitSettingsWindow();
        });

        await Electron.IpcMain.On("check-for-updates", async (data) =>
        {
            await CheckForUpdates();
        });

        await Electron.IpcMain.On("lock-overlay", (data) =>
        {
            Newtonsoft.Json.Linq.JArray array = (Newtonsoft.Json.Linq.JArray)data;
            bool locked = (bool)array[0];
            bool save = (bool)array[1];

            if (!locked) // enter edit mode
            {
                Electron.IpcMain.Send(mainWindow, "edit-mode");
                //TODO: wait for response instead of using a delay
                Task.Delay(200).ContinueWith((t) =>
                {
                    enteredEditMode = true;
                });
            }
            else
            {
                isShown = null;

                if (!SharedMemory.isRunning)
                {
                    Electron.IpcMain.Send(mainWindow, "hide");
                }
            }

            if (mainWindow != null)
            {
                mainWindow.SetIgnoreMouseEvents(locked);
                mainWindow.SetAlwaysOnTop(locked, OnTopLevel.screenSaver);
            }
            settingsWindow.SetAlwaysOnTop(!locked, OnTopLevel.screenSaver);

            if (locked && save) // save
            {
                Electron.IpcMain.Send(mainWindow, "save-hud-layout");
            }
            else if (locked && mainWindow != null) // cancel
            {
                SendHudLayout(mainWindow);
            }
        });

        await Electron.IpcMain.On("set-setting", (arg) =>
        {
            Electron.IpcMain.Send(mainWindow, "set-setting", arg.ToString());
            Newtonsoft.Json.Linq.JArray array = (Newtonsoft.Json.Linq.JArray)arg;
            if (array.Count == 2 && array[0] != null && array[0].Type == Newtonsoft.Json.Linq.JTokenType.String)
                SaveSetting(array[0].ToString(), array[1], false);
            else
                logger.Error("Invalid setting when attempting 'set-setting': " + arg);
        });


        await Electron.IpcMain.On("show-log-file", async (arg) =>
        {
            if (logFilePath == null)
            {
                await ShowMessageBox(settingsWindow, logFilePathWarning, "Warning", MessageBoxType.warning);
            }
            else
            {
                await Electron.Shell.ShowItemInFolderAsync(Path.Combine(logFilePath));
            }
        });

        settingsWindow.OnClosed += () => Electron.App.Quit();
    }

    private string? appVersion;
    private async Task<string> AppVersion() {
        return appVersion ??= await Electron.App.GetVersionAsync();
    }

    private async Task CheckForUpdates()
    {
        string currentVersion = await AppVersion();
        logger.Info("Checking for updates (current version: v" + currentVersion + ")");
        string? remoteUrl = await GetRedirectedUrl(githubUrl + "/" + githubReleasesUrl);
        if (remoteUrl == null)
        {
            logger.Error("Could not get remote URL for checking updates");
            return;
        }

        string remoteVersionText = remoteUrl.Split('/').Last();
        string remoteVersion = remoteVersionText.Split('v').Last().Split('-').First();
        currentVersion = currentVersion.Split('-').First();

        Version current = new(currentVersion);
        Version remote = new(remoteVersion);

        if (current < remote)
        {
            logger.Info("Update available: " + remoteVersion);

            await ShowMessageBox("A new version is available: " + remoteVersionText, "Update available", MessageBoxType.info, new string[] { "Show me", "Cancel" }).ContinueWith((t) =>
            {
                if (t.Result.Response == 0)
                {
                    Electron.Shell.OpenExternalAsync(remoteUrl);
                }
            });

            return;
        }
        logger.Info("No updates available");
    }

    public static async Task<string?> GetRedirectedUrl(string url)
    {
        //this allows you to set the settings so that we can get the redirect url
        var handler = new HttpClientHandler()
        {
            AllowAutoRedirect = false
        };
        string? redirectedUrl = null;

        using (HttpClient client = new(handler))
        using (HttpResponseMessage response = await client.GetAsync(url))
        using (HttpContent content = response.Content)
        {
            // ... Read the response to see if we have the redirected url
            if (response.StatusCode == System.Net.HttpStatusCode.Found)
            {
                HttpResponseHeaders headers = response.Headers;
                if (headers != null && headers.Location != null)
                {
                    redirectedUrl = headers.Location.AbsoluteUri;
                }
            }
        }

        return redirectedUrl;
    }


    private static async Task<MessageBoxResult> ShowMessageBox(BrowserWindow window, string message, string title = "Error", MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        return await Electron.Dialog.ShowMessageBoxAsync(window, options);
    }

    private static async Task<MessageBoxResult> ShowMessageBox(string message, string title = "Error", MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        return await Electron.Dialog.ShowMessageBoxAsync(options);
    }

    private static async Task<MessageBoxResult> ShowMessageBox(string message, string title = "Error", MessageBoxType type = MessageBoxType.error, string[]? buttons = null)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        if (buttons != null)
            options.Buttons = buttons;
        return await Electron.Dialog.ShowMessageBoxAsync(options);
    }

    private static MessageBoxOptions PrepareMessageBox(string message, string title = "Error", MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = new(message)
        {
            Type = type,
            Title = title
        };

        switch (type)
        {
            case MessageBoxType.error:
                logger.Error(message);
                break;
            case MessageBoxType.info:
                logger.Info(message);
                break;
            case MessageBoxType.warning:
                logger.Warn(message);
                break;
        }

        return options;
    }

    private void SaveSetting(string key, object value, bool sendToWindow = true)
    {
        settings.Set(key, value);

        if (settingsWindow != null && sendToWindow)
            Electron.IpcMain.Send(settingsWindow, "settings", settings.Serialize());
    }

    private object GetHudLayout()
    {
        return settings.Get("hudLayout", new Dictionary<string, object>());
    }

    private void SetHudLayout(object layout)
    {
        SaveSetting("hudLayout", layout);
    }

    bool userDataClearedForMultiplier = false;

    bool? isShown = null;

    private void RunLoop(BrowserWindow window, IWebHostEnvironment env)
    {
        fuelData.Load();

        using var memory = new SharedMemory();


        Thread.Sleep(1000);
        if (env.IsDevelopment())
            Electron.IpcMain.Send(window, "show");

        int iter = 0;
        ExtraData extraData = new()
        {
            forceUpdateAll = false
        };
        Thread thread = new(() => memory.Run((data) =>
        {
            if (data.fuelUseActive != 1 && !userDataClearedForMultiplier)
            {
                userDataClearedForMultiplier = true;
                fuelData.Save();
                fuelData.Clear();
            }
            else if (data.fuelUseActive == 1 && userDataClearedForMultiplier)
            {
                userDataClearedForMultiplier = false;
                fuelData.Clear();
                fuelData.Load();
            }

            extraData.rawData = data;
            extraData.rawData.driverData = extraData.rawData.driverData.Take(data.numCars).ToArray();
            if (data.layoutId != -1 && data.vehicleInfo.modelId != -1 && iter % (1000 / SharedMemory.timeInterval.Milliseconds) * 10 == 0)
            {
                FuelCombination combination = fuelData.GetCombination(data.layoutId, data.vehicleInfo.modelId);
                extraData.fuelPerLap = combination.GetAverageFuelUsage();
                extraData.fuelLastLap = combination.GetLastLapFuelUsage();
                extraData.averageLapTime = combination.GetAverageLapTime();
                extraData.bestLapTime = combination.GetBestLapTime();
                Tuple<int, double> lapData = Utilities.GetEstimatedLapCount(data, combination);
                extraData.estimatedRaceLapCount = lapData.Item1;
                extraData.lapsUntilFinish = lapData.Item2;
                iter = 0;
            }
            iter++;

            try
            {
                SaveData(data);
            }
            catch (Exception e)
            {
                logger.Error("Error saving data", e);
            }

            lastLap = data.completedLaps;
            bool notDriving = data.gameInMenus == 1 || (data.gamePaused == 1 && data.gameInReplay == 0) || data.sessionType == -1;
            if (enteredEditMode)
            {
                extraData.forceUpdateAll = true;
                Electron.IpcMain.Send(window, "data", JsonConvert.SerializeObject(extraData));
                extraData.forceUpdateAll = false;
                enteredEditMode = false;
            }
            else
            {
                Electron.IpcMain.Send(window, "data", JsonConvert.SerializeObject(extraData));
            }

            if (notDriving)
            {
                if (!env.IsDevelopment() && window != null && (isShown ?? true))
                {
                    Electron.IpcMain.Send(window, "hide");
                    isShown = false;
                }

                recordingData = false;

                if (data.sessionType == -1)
                {
                    lastLap = -1;
                    lastFuel = -1;
                }
            }
            else if (window != null && !(isShown ?? false))
            {
                Electron.IpcMain.Send(window, "show");
                window.SetAlwaysOnTop(true, OnTopLevel.screenSaver);
                isShown = true;
            }
        }));
        thread.Start();
    }


    private bool recordingData = false;
    private double lastFuel = -1;
    private int lastLap = -1;
    private void SaveData(R3E.Data.Shared data)
    {
        if (lastLap == -1 || lastLap == data.completedLaps || fuelData == null)
            return;

        if (!recordingData)
        {
            recordingData = true;
            lastFuel = data.fuelLeft;
            return;
        }

        int modelId = data.vehicleInfo.modelId;
        int layoutId = data.layoutId;
        FuelCombination combo = fuelData.GetCombination(layoutId, modelId);

        if (data.lapTimePreviousSelf > 0)
            combo.AddLapTime(data.lapTimePreviousSelf);

        if (data.fuelUseActive >= 1 && lastFuel != -1)
        {
            combo.AddFuelUsage(lastFuel - data.fuelLeft, data.lapTimePreviousSelf > 0);
        }

        if (data.fuelUseActive <= 1)
            fuelData.Save();

        lastFuel = data.fuelLeft;
    }
}
