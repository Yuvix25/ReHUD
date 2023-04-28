using ElectronNET.API;
using ElectronNET.API.Entities;
using Newtonsoft.Json;
using System.Diagnostics;

namespace ReHUD;

public class Startup
{
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


    private const string userDataFile = "userData.json";
    private const string settingsFile = "settings.json";
    private static string dataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "ReHUD");
    private R3E.UserData? userData;

    private async Task CreateMainWindow(IWebHostEnvironment env)
    {
        // double factor = (await Electron.Screen.GetPrimaryDisplayAsync()).WorkAreaSize.Width / 1920.0;
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
        });

        bool gotLock = await Electron.App.RequestSingleInstanceLockAsync((args, arg) => { });
        if (!gotLock)
        {
            MessageBoxOptions options = new MessageBoxOptions("Another instance of ReHUD is already running.");
            options.Type = MessageBoxType.error;
            options.Title = "Error";

            await Electron.Dialog.ShowMessageBoxAsync(window, options);
            Electron.App.Quit();
            return;
        }


        window.SetAlwaysOnTop(true, OnTopLevel.screenSaver);

        if (!env.IsDevelopment())
            window.SetIgnoreMouseEvents(true);


        await Electron.IpcMain.On("get-hud-layout", (args) => {
            sendHudLayout(window);
        });

        await Electron.IpcMain.On("set-hud-layout", (args) => {
            SetHudLayout(JsonConvert.DeserializeObject<Object>(args.ToString() ?? "{}") ?? new Dictionary<String, Object>());
        });

        RunLoop(window, env);

        window.OnClosed += () => Electron.App.Quit();
    }
    
    private void sendHudLayout(ElectronNET.API.BrowserWindow window)
    {
        Electron.IpcMain.Send(window, "hud-layout", JsonConvert.SerializeObject(GetHudLayout()));
    }


    private async Task CreateSettingsWindow(IWebHostEnvironment env)
    {
        var window = await Electron.WindowManager.CreateWindowAsync(new BrowserWindowOptions()
        {
            Width = 800,
            Height = 600,
            Icon = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "ReHUD.png"),
        });

        if (!env.IsDevelopment() && false)
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

            if (locked && save) {
                Electron.IpcMain.Send(mainWindow, "save-hud-layout");
            } else if (locked) {
                sendHudLayout(mainWindow);
            }
        });

        await Electron.IpcMain.On("set-setting", (arg) =>
        {
            Electron.IpcMain.Send(mainWindow, "set-setting", arg.ToString());
            SaveSetting((Newtonsoft.Json.Linq.JArray)arg);
        });

        window.OnClosed += () => Electron.App.Quit();
    }

    Dictionary<String, Object> settings = GetSettings();

    private void SaveSetting(Newtonsoft.Json.Linq.JArray setting)
    {
        
        settings[setting[0].ToString()] = setting[1];
        WriteDataFile(settingsFile, JsonConvert.SerializeObject(settings));
    }

    private static Dictionary<String, Object> GetSettings()
    {
        return JsonConvert.DeserializeObject<Dictionary<String, Object>>(ReadDataFile(settingsFile)) ?? new Dictionary<String, Object>();
    }

    private Object GetHudLayout() {
        return settings.ContainsKey("hudLayout") ? settings["hudLayout"] : new Dictionary<String, Object>();
    }

    private void SetHudLayout(Object layout)
    {
        settings["hudLayout"] = layout;
        WriteDataFile(settingsFile, JsonConvert.SerializeObject(settings));
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


    private void RunLoop(BrowserWindow window, IWebHostEnvironment env)
    {
        userData = JsonConvert.DeserializeObject<R3E.UserData>(ReadDataFile(userDataFile)) ?? new R3E.UserData();

        using (var memory = new R3E.SharedMemory())
        {
            bool? isShown = null;
            Thread.Sleep(1000);
            if (env.IsDevelopment())
                Electron.IpcMain.Send(window, "show");

            // try {
            //     Console.WriteLine(R3E.Utilities.GetDataFilePath());
            // } catch (Exception e) {
            //     Console.WriteLine(e);
            // }

            int iter = 0;
            ExtraData extraData = new ExtraData();
            Thread thread = new Thread(() => memory.Run((data) =>
            {
                R3E.Combination combination = userData.GetCombination(data.LayoutId, data.VehicleInfo.ModelId);
                extraData.RawData = data;
                if (iter % (1000 / R3E.SharedMemory.timeInterval.Milliseconds) * 10 == 0)
                {
                    extraData.FuelPerLap = combination.GetAverageFuelUsage();
                    extraData.FuelLastLap = combination.GetLastLapFuelUsage();
                    extraData.AverageLapTime = combination.GetAverageLapTime();
                    extraData.BestLapTime = combination.GetBestLapTime();
                    extraData.LapsUntilFinish = R3E.Utilities.GetLapsUntilFinish(data, combination);
                    iter = 0;
                }
                iter++;

                try
                {
                    SaveData(data);
                }
                catch (Exception e)
                {
                    Console.WriteLine(e);
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

        if (data.FuelUseActive == 1 && lastFuel != -1)
        {
            combo.AddFuelUsage(lastFuel - data.FuelLeft, data.LapTimePreviousSelf > 0);
        }

        WriteDataFile(userDataFile, JsonConvert.SerializeObject(userData));
        lastFuel = data.FuelLeft;
    }
}
