using ElectronNET.API;
using ElectronNET.API.Entities;
using Newtonsoft.Json;
using log4net;
using log4net.Appender;
using log4net.Repository.Hierarchy;
using log4net.Config;
using System.Reflection;

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

    private const string anotherInstanceMessage = "Another instance of ReHUD is already running";
    private const string logFilePathWarning = "Log file path could not be determined. Try searching for a file name 'ReHUD.log' in C:\\Users\\<username>\\AppData\\Local\\Programs\\rehud\\resources\\bin";

    private const string userDataFile = "userData.json";
    private const string settingsFile = "settings.json";
    private static string dataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "ReHUD");
    private R3E.UserData? userData;

    private async Task CreateMainWindow(IWebHostEnvironment env)
    {
        var window = await Electron.WindowManager.CreateWindowAsync(new BrowserWindowOptions()
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
            await ShowMessageBox(window, anotherInstanceMessage, "Error", MessageBoxType.error);
            Electron.App.Quit();
            return;
        }

        window.SetAlwaysOnTop(true, OnTopLevel.screenSaver);

        if (!env.IsDevelopment())
            window.SetIgnoreMouseEvents(true);


        await Electron.IpcMain.On("log", (args) =>
        {
            Newtonsoft.Json.Linq.JObject obj = (Newtonsoft.Json.Linq.JObject)args;
            if (obj == null || obj["level"] == null)
                return;
            string message = ((string)(obj["message"] ?? "(unknown)")).Trim();
            string level = ((string)obj["level"]).ToUpper();

            switch (level)
            {
                case "INFO":
                    logger.Debug(message);
                    break;
                case "WARN":
                    logger.Info(message);
                    break;
                case "ERROR":
                    logger.Error(message);
                    break;
            }
        });


        await Electron.IpcMain.On("get-hud-layout", (args) =>
        {
            SendHudLayout(window);
        });

        await Electron.IpcMain.On("set-hud-layout", (args) =>
        {
            SetHudLayout(JsonConvert.DeserializeObject<Object>(args.ToString() ?? "{}") ?? new Dictionary<String, Object>());
        });

        await Electron.IpcMain.On("reset-hud-layout", (args) =>
        {
            try
            {
                SendHudLayout(window, new Dictionary<String, Object>());
            }
            catch (Exception e)
            {
                logger.Error("Error resetting HUD layout", e);
            }
        });

        RunLoop(window, env);

        window.OnClosed += () => Electron.App.Quit();
    }

    private void SendHudLayout(ElectronNET.API.BrowserWindow window)
    {
        SendHudLayout(window, GetHudLayout());
    }

    private void SendHudLayout(ElectronNET.API.BrowserWindow window, object layout)
    {
        Electron.IpcMain.Send(window, "hud-layout", JsonConvert.SerializeObject(layout));
    }


    private async Task CreateSettingsWindow(IWebHostEnvironment env)
    {
        var window = await Electron.WindowManager.CreateWindowAsync(new BrowserWindowOptions()
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

        if (!env.IsDevelopment())
            window.RemoveMenu();

        window.OnReadyToShow += async () =>
        {
            var url = (await window.WebContents.GetUrl()).Split('#')[0];
            if (url.EndsWith("Settings"))
                return;
            Electron.IpcMain.Send(window, "settings", JsonConvert.SerializeObject(GetSettings()));
        };

        var mainWindow = Electron.WindowManager.BrowserWindows.First();

        await Electron.IpcMain.On("lock-overlay", (data) =>
        {
            Newtonsoft.Json.Linq.JArray array = (Newtonsoft.Json.Linq.JArray)data;
            bool locked = (bool)array[0];
            bool save = (bool)array[1];
            mainWindow.SetIgnoreMouseEvents(locked);
            mainWindow.SetAlwaysOnTop(locked, OnTopLevel.screenSaver);
            window.SetAlwaysOnTop(!locked, OnTopLevel.screenSaver);

            if (locked && save)
            {
                Electron.IpcMain.Send(mainWindow, "save-hud-layout");
            }
            else if (locked)
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
                await ShowMessageBox(window, logFilePathWarning, "Warning", MessageBoxType.warning);
            }
            else
            {
                await Electron.Shell.ShowItemInFolderAsync(Path.Combine(logFilePath));
            }
        });

        window.OnClosed += () => Electron.App.Quit();
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

    Dictionary<String, Object> settings = GetSettings();

    private void SaveSetting(String key, Object value)
    {
        if (key == null)
            return;
        settings[key] = value;
        WriteDataFile(settingsFile, JsonConvert.SerializeObject(settings));
    }

    private static Dictionary<String, Object> GetSettings()
    {
        return JsonConvert.DeserializeObject<Dictionary<String, Object>>(ReadDataFile(settingsFile)) ?? new Dictionary<String, Object>();
    }

    private object GetHudLayout()
    {
        return settings.ContainsKey("hudLayout") ? settings["hudLayout"] : new Dictionary<String, Object>();
    }

    private void SetHudLayout(Object layout)
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

    private static String ReadDataFile(String name)
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

    private void WriteDataFile(String name, String data)
    {
        File.WriteAllText(Path.Combine(dataPath, name), data);
    }


    bool userDataClearedForMultiplier = false;

    private void RunLoop(BrowserWindow window, IWebHostEnvironment env)
    {
        userData = GetUserData();

        using (var memory = new R3E.SharedMemory())
        {
            bool? isShown = null;
            Thread.Sleep(1000);
            if (env.IsDevelopment())
                Electron.IpcMain.Send(window, "show");

            int iter = 0;
            ExtraData extraData = new ExtraData();
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
                int driverDataSize = 0;
                foreach (var d in extraData.RawData.DriverData)
                {
                    if (d.DriverInfo.CarNumber == -1)
                        break;
                    driverDataSize++;
                }
                extraData.RawData.DriverData = extraData.RawData.DriverData.Take(driverDataSize).ToArray();
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
                if (!notDriving || env.IsDevelopment())
                    Electron.IpcMain.Send(window, "data", extraData);

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
