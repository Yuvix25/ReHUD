using ElectronNET.API;
using ElectronNET.API.Entities;
using Newtonsoft.Json;
using log4net;
using log4net.Appender;
using log4net.Repository.Hierarchy;
using log4net.Config;
using System.Reflection;
using System.Net.Http.Headers;

namespace ReHUD;

public class Startup
{
    public static ILog logger = LogManager.GetLogger(MethodBase.GetCurrentMethod()?.DeclaringType);
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
                await CreateMainWindow(env);
                await CreateSettingsWindow(env);
            };
        }
    }


    private BrowserWindow? mainWindow;
    private BrowserWindow? settingsWindow;

    private const string githubUrl = "https://github.com/Yuvix25/ReHUD";
    private const string githubReleasesUrl = "releases/latest";
    private const string anotherInstanceMessage = "Another instance of ReHUD is already running";
    private const string logFilePathWarning = "Log file path could not be determined. Try searching for a file name 'ReHUD.log' in C:\\Users\\<username>\\AppData\\Local\\Programs\\rehud\\resources\\bin";

    private const string userDataFile = "userData.json";
    private const string settingsFile = "settings.json";
    private static string dataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "ReHUD");
    private R3E.UserData? userData;

    private async Task CreateMainWindow(IWebHostEnvironment env)
    {
        mainWindow = await Electron.WindowManager.CreateWindowAsync(new BrowserWindowOptions()
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
                // ContextIsolation = true,
            },
        });

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

        RunLoop(mainWindow, env);

        mainWindow.OnClosed += () => Electron.App.Quit();
    }

    private void SendHudLayout(ElectronNET.API.BrowserWindow window)
    {
        SendHudLayout(window, GetHudLayout());
    }

    private void SendHudLayout(ElectronNET.API.BrowserWindow window, object layout)
    {
        Electron.IpcMain.Send(window, "hud-layout", JsonConvert.SerializeObject(layout));
        if (settingsWindow != null)
            Electron.IpcMain.Send(settingsWindow, "hud-layout", JsonConvert.SerializeObject(layout));
    }


    private async Task SendSettingsWindowSignal(BrowserWindow window)
    {
        var url = (await window.WebContents.GetUrl()).Split('#')[0];
        if (url.EndsWith("Settings"))
            return;
        Electron.IpcMain.Send(window, "settings", JsonConvert.SerializeObject(GetSettings()));
    }


    bool enteredEditMode = false;

    private async Task CreateSettingsWindow(IWebHostEnvironment env)
    {
        settingsWindow = await Electron.WindowManager.CreateWindowAsync(new BrowserWindowOptions()
        {
            Width = 800,
            Height = 600,
            Icon = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "ReHUD.png"),
            WebPreferences = new WebPreferences()
            {
                // ContextIsolation = true,
                EnableRemoteModule = true,
                NodeIntegration = true,
                // Preload = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "js", "utils.js"),
            },
        });

        settingsWindow.Minimize();

        if (!env.IsDevelopment())
            settingsWindow.RemoveMenu();

        settingsWindow.OnReadyToShow += async () =>
        {
            await SendSettingsWindowSignal(settingsWindow);
        };


        var mainWindow = Electron.WindowManager.BrowserWindows.First();

        await Electron.IpcMain.On("whoami", async (data) =>
        {
            await SendSettingsWindowSignal(settingsWindow);
        });

        await Electron.IpcMain.On("check-for-updates", async (data) =>
        {
            Tuple<string, string>? newVersion = await CheckForUpdates();
            if (newVersion != null)
            {
                string versionUrl = newVersion.Item1;
                string newVersionText = newVersion.Item2;
                await ShowMessageBox("A new version is available: " + newVersionText, "Update available", MessageBoxType.info, new string[] { "Show me", "Cancel" }).ContinueWith((t) =>
                {
                    if (t.Result.Response == 0)
                    {
                        Electron.Shell.OpenExternalAsync(versionUrl);
                    }
                });
            }
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

                if (!R3E.SharedMemory.isRunning)
                {
                    Electron.IpcMain.Send(mainWindow, "hide");
                }
            }

            mainWindow.SetIgnoreMouseEvents(locked);
            mainWindow.SetAlwaysOnTop(locked, OnTopLevel.screenSaver);
            settingsWindow.SetAlwaysOnTop(!locked, OnTopLevel.screenSaver);

            if (locked && save) // save
            {
                Electron.IpcMain.Send(mainWindow, "save-hud-layout");
            }
            else if (locked) // cancel
            {
                SendHudLayout(mainWindow);
            }
        });

        await Electron.IpcMain.On("set-setting", (arg) =>
        {
            Electron.IpcMain.Send(mainWindow, "set-setting", arg.ToString());
            Newtonsoft.Json.Linq.JArray array = (Newtonsoft.Json.Linq.JArray)arg;
            if (array.Count == 2 && array[0] != null && array[0].Type == Newtonsoft.Json.Linq.JTokenType.String)
                SaveSetting(array[0].ToString(), array[1]);
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


    private async Task<Tuple<string, string>?> CheckForUpdates()
    {
        string currentVersion = await Electron.App.GetVersionAsync();
        logger.Info("Checking for updates (current version: " + currentVersion + ")");
        string? remoteUrl = await GetRedirectedUrl(githubUrl + "/" + githubReleasesUrl);
        if (remoteUrl == null)
        {
            logger.Error("Could not get remote URL for checking updates");
            return null;
        }

        string remoteVersionText = remoteUrl.Split('/').Last();
        string remoteVersion = remoteVersionText.Split('v').Last().Split('-').First();

        Version current = new Version(currentVersion);
        Version remote = new Version(remoteVersion);

        if (current < remote)
        {
            logger.Info("Update available: " + remoteVersion);
            return Tuple.Create(remoteUrl, remoteVersionText);
        }
        logger.Info("No updates available");
        return null;
    }

    public static async Task<string?> GetRedirectedUrl(string url)
    {
        //this allows you to set the settings so that we can get the redirect url
        var handler = new HttpClientHandler()
        {
            AllowAutoRedirect = false
        };
        string? redirectedUrl = null;

        using (HttpClient client = new HttpClient(handler))
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


    private async Task<MessageBoxResult> ShowMessageBox(BrowserWindow window, string message, string title = "Error", MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        return await Electron.Dialog.ShowMessageBoxAsync(window, options);
    }

    private async Task<MessageBoxResult> ShowMessageBox(string message, string title = "Error", MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        return await Electron.Dialog.ShowMessageBoxAsync(options);
    }

    private async Task<MessageBoxResult> ShowMessageBox(string message, string title = "Error", MessageBoxType type = MessageBoxType.error, string[]? buttons = null)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        if (buttons != null)
            options.Buttons = buttons;
        return await Electron.Dialog.ShowMessageBoxAsync(options);
    }

    private MessageBoxOptions PrepareMessageBox(string message, string title = "Error", MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = new MessageBoxOptions(message);
        options.Type = type;
        options.Title = title;

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

    Dictionary<string, object> settings = GetSettings();

    private void SaveSetting(string key, object value)
    {
        if (key == null)
            return;
        settings[key] = value;
        WriteDataFile(settingsFile, JsonConvert.SerializeObject(settings));

        if (settingsWindow != null)
            Electron.IpcMain.Send(settingsWindow, "settings", settings);
    }

    private static Dictionary<string, object> GetSettings()
    {
        return JsonConvert.DeserializeObject<Dictionary<string, object>>(ReadDataFile(settingsFile)) ?? new Dictionary<string, object>();
    }

    private object GetHudLayout()
    {
        return settings.ContainsKey("hudLayout") ? settings["hudLayout"] : new Dictionary<string, object>();
    }

    private void SetHudLayout(object layout)
    {
        SaveSetting("hudLayout", layout);
    }

    private R3E.UserData GetUserData()
    {
        return JsonConvert.DeserializeObject<R3E.UserData>(ReadDataFile(userDataFile)) ?? new R3E.UserData();
    }

    private void SaveUserData(R3E.UserData data)
    {
        WriteDataFile(userDataFile, JsonConvert.SerializeObject(data));
    }

    private static string ReadDataFile(string name)
    {
        try
        {
            if (!Directory.Exists(dataPath))
            {
                Directory.CreateDirectory(dataPath);
            }
            return File.ReadAllText(Path.Combine(dataPath, name));
        }
        catch
        {
            return "{}";
        }
    }

    private void WriteDataFile(string name, string data)
    {
        File.WriteAllText(Path.Combine(dataPath, name), data);
    }


    bool userDataClearedForMultiplier = false;

    bool? isShown = null;

    private void RunLoop(BrowserWindow window, IWebHostEnvironment env)
    {
        userData = GetUserData();

        using (var memory = new R3E.SharedMemory())
        {
            Thread.Sleep(1000);
            if (env.IsDevelopment())
                Electron.IpcMain.Send(window, "show");

            int iter = 0;
            ExtraData extraData = new ExtraData();
            extraData.ForceUpdateAll = false;
            Thread thread = new Thread(() => memory.Run((data) =>
            {
                if (data.FuelUseActive != 1 && !userDataClearedForMultiplier)
                {
                    userDataClearedForMultiplier = true;
                    SaveUserData(userData);
                    userData = new R3E.UserData();
                }
                else if (data.FuelUseActive == 1 && userDataClearedForMultiplier)
                {
                    userDataClearedForMultiplier = false;
                    userData = GetUserData();
                }


                R3E.Combination combination = userData.GetCombination(data.LayoutId, data.VehicleInfo.ModelId);
                extraData.RawData = data;
                extraData.RawData.DriverData = extraData.RawData.DriverData.Take(data.NumCars).ToArray();
                if (iter % (1000 / R3E.SharedMemory.timeInterval.Milliseconds) * 10 == 0)
                {
                    extraData.FuelPerLap = combination.GetAverageFuelUsage();
                    extraData.FuelLastLap = combination.GetLastLapFuelUsage();
                    extraData.AverageLapTime = combination.GetAverageLapTime();
                    extraData.BestLapTime = combination.GetBestLapTime();
                    Tuple<int, double> lapData = R3E.Utilities.GetEstimatedLapCount(data, combination);
                    extraData.EstimatedRaceLapCount = lapData.Item1;
                    extraData.LapsUntilFinish = lapData.Item2;
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

                lastLap = data.CompletedLaps;
                bool notDriving = data.GameInMenus == 1 || (data.GamePaused == 1 && data.GameInReplay == 0) || data.SessionType == -1;
                if (!notDriving || env.IsDevelopment() || enteredEditMode)
                {
                    if (enteredEditMode)
                    {
                        extraData.ForceUpdateAll = true;
                        Electron.IpcMain.Send(window, "data", extraData);
                        extraData.ForceUpdateAll = false;
                        enteredEditMode = false;
                    }
                    else
                    {
                        Electron.IpcMain.Send(window, "data", extraData);
                    }
                }

                if (notDriving)
                {
                    if (!env.IsDevelopment() && window != null && (isShown ?? true))
                    {
                        Electron.IpcMain.Send(window, "hide");
                        isShown = false;
                    }

                    recordingData = false;

                    if (data.SessionType == -1)
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
    }


    private bool recordingData = false;
    private double lastFuel = -1;
    private int lastLap = -1;
    private void SaveData(R3E.Data.Shared data)
    {
        if (lastLap == -1 || lastLap == data.CompletedLaps || userData == null)
            return;

        if (!recordingData)
        {
            recordingData = true;
            lastFuel = data.FuelLeft;
            return;
        }

        int modelId = data.VehicleInfo.ModelId;
        int layoutId = data.LayoutId;
        R3E.Combination combo = userData.GetCombination(layoutId, modelId);

        if (data.LapTimePreviousSelf > 0)
            combo.AddLapTime(data.LapTimePreviousSelf);

        if (data.FuelUseActive >= 1 && lastFuel != -1)
        {
            combo.AddFuelUsage(lastFuel - data.FuelLeft, data.LapTimePreviousSelf > 0);
        }

        if (data.FuelUseActive <= 1)
            SaveUserData(userData);

        lastFuel = data.FuelLeft;
    }
}
