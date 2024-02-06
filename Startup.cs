using ElectronNET.API;
using ElectronNET.API.Entities;
using Newtonsoft.Json;
using log4net;
using log4net.Config;
using System.Reflection;
using System.Net.Http.Headers;
using R3E;
using SignalRChat.Hubs;
using Newtonsoft.Json.Linq;

namespace ReHUD;

public class Startup
{
    public static readonly ILog logger = LogManager.GetLogger(MethodBase.GetCurrentMethod()?.DeclaringType);
    string? logFilePath;

    public Startup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    // This method gets called by the runtime. Use this method to add services to the container.
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddSignalR();
        services.AddRazorPages();
    }

    // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        logFilePath = Path.Combine(JsonUserData.dataPath, "ReHUD.log");
        GlobalContext.Properties["LogFilePath"] = logFilePath;

        var logRepository = LogManager.GetRepository(Assembly.GetEntryAssembly());
        XmlConfigurator.Configure(logRepository, new FileInfo("log4net.config"));

        version.Load();
        _ = AppVersion().ContinueWith(async (t) =>
        {
            await version.Update(t.Result);
            lapPointsData.Load();
            settings.Load();
            await LoadSettings();

            HudLayout.LoadHudLayouts();
            
            try {
                string preset = await Electron.App.CommandLine.GetSwitchValueAsync("preset");
                if (preset != null && preset.Length > 0)
                {
                    HudLayout? layout = HudLayout.GetHudLayout(preset);
                    if (layout != null)
                    {
                        HudLayout.SetActiveLayout(layout);
                    }
                    else
                    {
                        logger.Warn("Could not find preset: " + preset);
                    }
                }
            }
            catch (Exception e) {
                logger.Error("Error loading preset", e);
            }
        });

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
            endpoints.MapHub<ReHUDHub>("/ReHUDHub");
            endpoints.MapRazorPages();
        });

        Electron.App.CommandLine.AppendSwitch("enable-transparent-visuals");

        if (HybridSupport.IsElectronActive)
        {
            Electron.App.Ready += async () =>
            {
                try
                {
                    await Electron.IpcMain.On("get-port", (args) =>
                    {
                        var windows = new[] { MainWindow, SettingsWindow }.Where(x => x != null);

                        foreach (var window in windows)
                        {
                            Electron.IpcMain.Send(window, "port", BridgeSettings.WebPort);
                        }
                    });
                    await CreateMainWindow();
                    await CreateSettingsWindow(env);

                    await Task.Delay(1000); // TODO
                    if (settings.DidLoad)
                    {
                        await LoadSettings();
                    }
                }
                catch (Exception e)
                {
                    logger.Error("Error creating windows", e);
                }
            };
        }
    }


    public static BrowserWindow? MainWindow { get; private set; }
    public static BrowserWindow? SettingsWindow { get; private set; }

    private const string githubUrl = "https://github.com/Yuvix25/ReHUD";
    private const string githubReleasesUrl = "releases/latest";
    private const string anotherInstanceMessage = "Another instance of ReHUD is already running";
    private const string logFilePathWarning = "Log file path could not be determined. Try searching for a file named 'ReHUD.log' in C:\\Users\\<username>\\Documents\\ReHUD";

    internal static readonly ReHUDVersion version = new();
    internal static readonly FuelData fuelData = new();
    internal static readonly LapPointsData lapPointsData = new();
    internal static readonly Settings settings = new();

    private string[]? usedKeys = null;

    private static async Task<BrowserWindow> CreateWindowAsync(BrowserWindowOptions options, string loadUrl = "/")
    {
        loadUrl = "http://localhost:" + BridgeSettings.WebPort + loadUrl;
        return await Electron.WindowManager.CreateWindowAsync(options, loadUrl);
    }

    private async Task CreateMainWindow()
    {
        await Electron.IpcMain.On("used-keys", (args) => {
            if (args == null)
                return;

            usedKeys = ((JArray)args).Select(x => (string?)x).Where(x => x != null).ToArray()!;
        });

        MainWindow = await CreateWindowAsync(new BrowserWindowOptions()
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
            await ShowMessageBox(MainWindow, anotherInstanceMessage, "Error", MessageBoxType.error);
            Electron.App.Quit();
            return;
        }

        MainWindow.SetAlwaysOnTop(true, OnTopLevel.screenSaver);
        MainWindow.SetIgnoreMouseEvents(true);

        await Electron.IpcMain.On("get-hud-layout", (args) =>
        {
            SendHudLayout();
        });

        await Electron.IpcMain.On("set-hud-layout", (args) =>
        {
            if (args == null || args.ToString() == null)
                return;

            string argsString = args.ToString()!;

            HudLayout? layout;
            if (argsString.Length > 0 && argsString[0] == '{')
            {
                try
                {
                    Dictionary<string, HudElement>? layoutElements = JsonConvert.DeserializeObject<Dictionary<string, HudElement>>(argsString);
                    if (layoutElements == null)
                    {
                        logger.Error("Invalid HUD layout: " + args);
                        return;
                    }
                    layout = HudLayout.ActiveHudLayout;
                    if (layout == null)
                    {
                        logger.Warn("No active HUD layout, creating a new one");
                        layout = HudLayout.AddHudLayout(new HudLayout(true));
                    }
                    layout.UpdateElements(layoutElements);
                }
                catch (Exception e)
                {
                    logger.Error("Error deserializing HUD layout", e);
                    return;
                }
            }
            else
            {
                layout = HudLayout.GetHudLayout(argsString);
                if (layout != null) HudLayout.SetActiveLayout(layout);
            }
            if (layout == null)
            {
                logger.Error("Invalid HUD layout: " + args);
                return;
            }
            SetHudLayout(layout);
        });

        await Electron.IpcMain.On("load-replay-preset", (args) => {
            var layout = HudLayout.LoadReplayLayout();
            if (layout != null)
            {
                SetHudLayout(layout, true, false);
            }
        });
        await Electron.IpcMain.On("unload-replay-preset", (args) =>
        {
            var layout = HudLayout.UnloadReplayLayout();
            if (layout != null)
            {
                SetHudLayout(layout, true);
            }
        });

        await Electron.IpcMain.On("update-preset-name", async (args) =>
        {
            JArray array = (JArray)args;
            string? oldName = (string?)array[0];
            string? newName = (string?)array[1];

            if (oldName == null || newName == null)
                return;

            var layout = HudLayout.GetHudLayout(oldName);
            if (layout != null)
            {
                await RenameLayout(layout, newName);
            }
        });

        await Electron.IpcMain.On("update-preset-is-replay", (args) =>
        {
            JArray array = (JArray)args;
            string? name = (string?)array[0];
            bool isReplay = (bool)array[1];

            if (name == null)
                return;

            var layout = HudLayout.GetHudLayout(name);
            if (layout != null)
            {
                layout.IsReplayLayout = isReplay;
                layout.Save();

                SendHudLayout();
            }
        });

        await Electron.IpcMain.On("toggle-element", (args) =>
        {
            JArray array = (JArray)args;
            string? elementId = (string?)array[0];
            bool shown = (bool)array[1];

            if (elementId == null)
                return;

            Electron.IpcMain.Send(MainWindow, "toggle-element", elementId, shown);
        });

        await Electron.IpcMain.On("reset-active-layout", (args) =>
        {
            try
            {
                var layout = HudLayout.ActiveHudLayout;
                if (layout != null)
                {
                    layout.Reset();
                    SendHudLayout();
                }
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

        RunLoop(MainWindow);

        Electron.App.BeforeQuit += async (QuitEventArgs args) =>
        {
            args.PreventDefault();
            Electron.IpcMain.Send(MainWindow, "quit");
            Electron.IpcMain.Send(SettingsWindow, "quit");
            await Task.Delay(300);
            logger.Info("Exiting...");
            Electron.App.Exit(0);
        };
        MainWindow.OnClosed += () => Electron.App.Quit();
    }

    public static void SaveBestLap(int layoutId, int classId, double laptime, double[] points, double pointsPerMeter)
    {
        LapPointsCombination combination = lapPointsData.GetCombination(layoutId, classId);
        combination.Set(laptime, points, pointsPerMeter);

        lapPointsData.Save();
    }
    public static string LoadBestLap(int layoutId, int classId)
    {
        LapPointsCombination? combination = lapPointsData.GetCombination(layoutId, classId, false);
        if (combination == null)
            return "{}";
        return combination.Serialize();
    }


    private static void SendHudLayout()
    {
        var layout = GetHudLayout();
        if (layout == null)
            return;
        SendHudLayout(layout);
    }

    private static void SendHudLayout(HudLayout layout, bool sendToSettings = true)
    {
        Electron.IpcMain.Send(MainWindow, "hud-layout", layout.SerializeElements());
        if (SettingsWindow != null && sendToSettings)
        {
            Electron.IpcMain.Send(SettingsWindow, "hud-layouts", HudLayout.SerializeLayouts(true));
        }
    }


    private async Task InitSettingsWindow()
    {
        Electron.IpcMain.Send(MainWindow, "settings", settings.Serialize());
        Electron.IpcMain.Send(SettingsWindow, "settings", settings.Serialize());
        Electron.IpcMain.Send(SettingsWindow, "version", await AppVersion());
    }


    private bool enteredEditMode = false;
    public static bool IsInEditMode { get; private set; }

    private async Task CreateSettingsWindow(IWebHostEnvironment env)
    {
        SettingsWindow = await CreateWindowAsync(new BrowserWindowOptions()
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

        SettingsWindow.Minimize();

        if (!env.IsDevelopment())
            SettingsWindow.RemoveMenu();

        await Electron.IpcMain.On("restart-app", (args) =>
        {
            Electron.App.Relaunch();
            Electron.App.Exit(0);
        });

        await Electron.IpcMain.On("load-settings", async (data) =>
        {
            await InitSettingsWindow();
        });

        await Electron.IpcMain.On("check-for-updates", async (data) =>
        {
            await CheckForUpdates();
        });

        await Electron.IpcMain.On("lock-overlay", async (data) =>
        {
            JArray array = (JArray)data;
            bool locked = (bool)array[0];
            bool save = (bool)array[1];

            if (!locked) // enter edit mode
            {
                if (MainWindow != null) {
                    await IpcCommunication.Invoke(MainWindow, "edit-mode");

                    logger.Info("Entering edit mode");

                    enteredEditMode = true;
                    IsInEditMode = true;

                    if (!SharedMemory.IsRunning) {
                        var extraData = new ExtraData
                        {
                            forceUpdateAll = true,
                            rawData = new R3E.Data.Shared
                            {
                                driverData = Array.Empty<R3E.Data.DriverData>(),
                            },
                            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                        };
                        logger.Info("Sending empty data for edit mode");
                        await IpcCommunication.Invoke(MainWindow, "r3eData", extraData.Serialize(usedKeys));
                    }
                }
            }
            else
            {
                isShown = null;
                IsInEditMode = false;

                if (!SharedMemory.IsRunning)
                {
                    Electron.IpcMain.Send(MainWindow, "hide");
                }
            }

            if (MainWindow != null)
            {
                MainWindow.SetIgnoreMouseEvents(locked);
                MainWindow.SetAlwaysOnTop(locked, OnTopLevel.screenSaver);
            }
            SettingsWindow.SetAlwaysOnTop(!locked, OnTopLevel.screenSaver);

            if (locked && save) // save
            {
                string? newName = array.Count > 2 ? (string?)array[2] : null;
                if (newName != null && HudLayout.ActiveHudLayout != null && HudLayout.ActiveHudLayout.Name != newName)
                {
                    await RenameActiveLayout(newName);
                }
                Electron.IpcMain.Send(MainWindow, "save-hud-layout");
            }
            else if (locked && MainWindow != null) // cancel
            {
                HudLayout.ActiveHudLayout?.Cancel();
                logger.Info("Canceling HUD layout changes");
                SendHudLayout();
            }
        });

        await Electron.IpcMain.On("set-setting", (arg) =>
        {
            Electron.IpcMain.Send(MainWindow, "set-setting", arg.ToString());
            JArray array = (JArray)arg;
            if (array.Count == 2 && array[0] != null && array[0].Type == JTokenType.String)
                _ = SaveSetting(array[0].ToString(), ConvertJToken(array[1])!, false);
            else
                logger.Error("Invalid setting when attempting 'set-setting': " + arg);
        });


        await Electron.IpcMain.On("show-log-file", async (arg) =>
        {
            if (logFilePath == null)
            {
                await ShowMessageBox(SettingsWindow, logFilePathWarning, "Warning", MessageBoxType.warning);
            }
            else
            {
                await Electron.Shell.ShowItemInFolderAsync(Path.Combine(logFilePath));
            }
        });

        await Electron.IpcMain.On("new-hud-layout", (arg) =>
        {
            var layout = HudLayout.AddHudLayout(new HudLayout(true));
            SendHudLayout(layout);
        });

        await Electron.IpcMain.On("delete-hud-layout", async (arg) =>
        {
            string? name = arg?.ToString();
            if (name == null)
                return;
            var layout = HudLayout.GetHudLayout(name);
            if (layout != null) {
                await layout.DeleteLayout();
                SendHudLayout();
            }
        });

        SettingsWindow.OnClosed += () => Electron.App.Quit();
    }


    private static object? ConvertJToken(JToken token)
    {
        if (token == null)
            return null;
        switch (token.Type)
        {
            case JTokenType.Object:
                return token.Children<JProperty>().ToDictionary(prop => prop.Name, prop => ConvertJToken(prop.Value));
            case JTokenType.Array:
                return token.Select(ConvertJToken).ToList();
            default:
                return ((JValue)token).Value ?? token;
        }
    }

    private string? appVersion;
    private async Task<string> AppVersion()
    {
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

        string remoteVersionText = remoteUrl.Split('/')[^1];

        Version current = ReHUDVersion.TrimVersion(currentVersion);
        Version remote = ReHUDVersion.TrimVersion(remoteVersionText);

        if (current.CompareTo(remote) < 0)
        {
            logger.Info("Update available: " + remoteVersionText);

            await ShowMessageBox("A new version is available: " + remoteVersionText, new string[] { "Show me", "Cancel" }, "Update available", MessageBoxType.info).ContinueWith((t) =>
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


    public static async Task<MessageBoxResult> ShowMessageBox(BrowserWindow? window, string message, string title = "Error", MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        if (window == null)
            return await Electron.Dialog.ShowMessageBoxAsync(options);
        return await Electron.Dialog.ShowMessageBoxAsync(window, options);
    }

    public static async Task<MessageBoxResult> ShowMessageBox(string message, string title = "Error", MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        return await Electron.Dialog.ShowMessageBoxAsync(options);
    }

    public static async Task<MessageBoxResult> ShowMessageBox(string message, string[] buttons, string title = "Error", MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        options.Buttons = buttons;
        return await Electron.Dialog.ShowMessageBoxAsync(options);
    }

    public static void QuitApp()
    {
        Electron.App.Quit();
    }

    private static MessageBoxOptions PrepareMessageBox(string message, string title = "Error", MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = new(message)
        {
            Type = type,
            Title = title,
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

    private static async Task SaveSetting(string key, object value, bool sendToWindow = true)
    {
        settings.Data.Set(key, value);
        settings.Save();

        await LoadSettings(key, value);

        if (SettingsWindow != null && sendToWindow)
            Electron.IpcMain.Send(SettingsWindow, "settings", settings.Serialize());
    }

    public static async Task LoadSettings(string? key = null, object? value = null) {
        if (key == null) {
            foreach (var setting in settings.Data.Settings) {
                await LoadSettings(setting.Key, setting.Value);
            }
        } else {
            if (value == null)
                return;
            switch (key) {
                case "screenToUse":
                    await LoadMonitor(value.ToString());
                    break;
                case "framerate":
                    if (IsInt(value))
                        SharedMemory.FrameRate = (long)value;
                    break;
                case "hardwareAcceleration":
                    if (value is bool hardwareAcceleration)
                        SetHardwareAccelerationEnabled(hardwareAcceleration);
                    break;
            }
        }
    }

    private static readonly string[] hardwareAccelerationSettings = new string[] { "disable-gpu-compositing", "disable-gpu", "disable-software-rasterizer" };
    private static void SetHardwareAccelerationEnabled(bool enabled) {
        logger.Info("Setting hardware acceleration: " + enabled);
        if (enabled) {
            foreach (var setting in hardwareAccelerationSettings) {
                Electron.App.CommandLine.AppendSwitch(setting);
            }
        } else {
            foreach (var setting in hardwareAccelerationSettings) {
                Electron.App.CommandLine.RemoveSwitch(setting);
            }
        }
    }

    private static bool IsInt(object value) {
        return value is long
            || value is ulong
            || value is int
            || value is uint
            || value is short
            || value is ushort;
    }

    private static async Task LoadMonitor(string? value = null) {
        if (MainWindow == null)
            return;
        var monitorId = value ?? await GetMainWindowDisplay();
        logger.Info("Loading monitor: " + monitorId);
        if (monitorId == null)
            return;
        var monitor = await GetDisplayById(monitorId);
        if (monitor == null)
            return;
        MainWindow.SetBounds(monitor.WorkArea);
    }

    private static HudLayout? GetHudLayout()
    {
        try
        {
            var layout = HudLayout.ActiveHudLayout;
            layout ??= HudLayout.AddHudLayout(new HudLayout(true));
            return layout;
        }
        catch (Exception e)
        {
            logger.Error("Error getting HUD layout", e);
            return null;
        }
    }

    private static void SetHudLayout(HudLayout layout, bool sendToSettings = false, bool removeBefore = true)
    {
        if (IsInEditMode) {
            logger.Info("Cannot set HUD layout while in edit mode");
            return;
        }
        layout = HudLayout.UpdateActiveHudLayout(layout, removeBefore);
        layout.Save();
        SendHudLayout(layout, sendToSettings);
    }

    private static async Task<bool> RenameActiveLayout(string newName)
    {
        if (HudLayout.ActiveHudLayout == null) {
            logger.Error("No active HUD layout");
            return false;
        }
        return await RenameLayout(HudLayout.ActiveHudLayout, newName);
    }

    private static async Task<bool> RenameLayout(HudLayout layout, string newName)
    {
        bool res = await layout.Rename(newName);
        if (res)
        {
            layout.Save();
        }
        else
        {
            DiscardNameChange();
        }
        return res;
    }

    private static void DiscardNameChange() {
        HudLayout layout = HudLayout.ActiveHudLayout ?? throw new InvalidOperationException("No active HUD layout");
        Electron.IpcMain.Send(SettingsWindow, "discard-name-change", layout.Name);
    }

    bool userDataClearedForMultiplier = false;

    bool? isShown = null;

    private void RunLoop(BrowserWindow window)
    {
        fuelData.Load();

        using var memory = new SharedMemory();

        Thread.Sleep(1000);

        int iter = 0;
        ExtraData extraData = new()
        {
            forceUpdateAll = false,
        };
        Thread thread = new(async () => await memory.Run(async (data) =>
        {
            extraData.timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
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
            extraData.rawData.numCars = Math.Max(data.numCars, data.position); // Bug in shared memory, sometimes numCars is updated in delay, this partially fixes it
            extraData.rawData.driverData = extraData.rawData.driverData.Take(extraData.rawData.numCars).ToArray();
            if (data.layoutId != -1 && data.vehicleInfo.modelId != -1 && iter % SharedMemory.FrameRate == 0)
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
                await IpcCommunication.Invoke(window, "r3eData", extraData.Serialize(usedKeys));
                extraData.forceUpdateAll = false;
                enteredEditMode = false;
            }
            else
            {
                await IpcCommunication.Invoke(window, "r3eData", extraData.Serialize(usedKeys));
            }

            if (notDriving)
            {
                if (window != null && (isShown ?? true))
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

    public static Task<Display[]> GetDisplays() {
        return Electron.Screen.GetAllDisplaysAsync();
    }

    public static async Task<string?> GetMainWindowDisplay() {
        if (settings.Data.Contains("screenToUse")) {
            return (string?)settings.Data.Get("screenToUse");
        }
        return (await Electron.Screen.GetPrimaryDisplayAsync()).Id;
    }

    public static async Task<Display?> GetDisplayById(string id) {
        return Array.Find(await GetDisplays(), x => x.Id == id);
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

        var fuelNow = data.vehicleInfo.engineType == 1 ? data.batterySoC : data.fuelLeft;

        int modelId = data.vehicleInfo.modelId;
        int layoutId = data.layoutId;
        FuelCombination combo = fuelData.GetCombination(layoutId, modelId);

        if (data.lapTimePreviousSelf > 0)
            combo.AddLapTime(data.lapTimePreviousSelf);

        if (data.fuelUseActive >= 1 && lastFuel != -1)
        {
            combo.AddFuelUsage(lastFuel - fuelNow, data.lapTimePreviousSelf > 0);
        }

        if (data.fuelUseActive <= 1)
            fuelData.Save();

        lastFuel = fuelNow;
    }
}
