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

        if (HybridSupport.IsElectronActive)
        {
            Electron.App.Ready += () => CreateWindow(env);
        }
    }


    private const string dataFile = "userData.json";
    private static string dirPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "ReHUD");
    private static string path = Path.Combine(dirPath, dataFile);
    private R3E.UserData? userData;

    private async void CreateWindow(IWebHostEnvironment env)
    {
        Electron.App.CommandLine.AppendSwitch("enable-transparent-visuals");
        Electron.App.CommandLine.AppendSwitch("disable-gpu-compositing");

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

        bool gotLock = await Electron.App.RequestSingleInstanceLockAsync((args, arg) => {});
        if (!gotLock)
        {
            MessageBoxOptions options = new MessageBoxOptions("Another instance of ReHUD is already running.");
            options.Type = MessageBoxType.error;
            options.Title = "Error";

            await Electron.Dialog.ShowMessageBoxAsync(window, options);
            Electron.App.Quit();
            return;
        }


        try {
            if (!Directory.Exists(dirPath)) {
                Directory.CreateDirectory(dirPath);
            }
            userData = JsonConvert.DeserializeObject<R3E.UserData>(File.ReadAllText(path));
            if (userData == null) {
                userData = new R3E.UserData();
            }
        } catch {
            userData = new R3E.UserData();
        }


        window.SetAlwaysOnTop(true, OnTopLevel.screenSaver);

        if (!env.IsDevelopment())
            window.SetIgnoreMouseEvents(true);

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
                if (iter % (1000 / R3E.SharedMemory.timeInterval.Milliseconds) * 10 == 0) {
                    extraData.FuelPerLap = combination.GetAverageFuelUsage();
                    extraData.FuelLastLap = combination.GetLastLapFuelUsage();
                    extraData.AverageLapTime = combination.GetAverageLapTime();
                    extraData.BestLapTime = combination.GetBestLapTime();
                    extraData.LapsUntilFinish = GetLapsUntilFinish(data, combination);
                    iter = 0;
                }
                iter++;

                try {
                    SaveData(data);
                } catch (Exception e) {
                    Console.WriteLine(e);
                }

                lastLap = data.CompletedLaps;
                bool notDriving = data.GameInMenus == 1 || (data.GamePaused == 1 && data.GameInReplay == 0) || data.SessionType == -1;
                if (!notDriving || env.IsDevelopment())
                    Electron.IpcMain.Send(window, "data", extraData);
                
                if (notDriving)
                {
                    if (!env.IsDevelopment() && window != null && (isShown ?? true)) {
                        Electron.IpcMain.Send(window, "hide");
                        isShown = false;
                    }
                    
                    recordingData = false;

                    if (data.SessionType == -1) {
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

        window.OnClosed += () => Electron.App.Quit();
    }

    private double GetLapsUntilFinish(R3E.Data.Shared data, R3E.Combination combination)
    {
        double fraction = data.LapDistanceFraction == -1 ? 0 : data.LapDistanceFraction;
        R3E.Data.DriverData? leader_ = GetLeader(data);
        if (leader_ == null)
        {
            return -1;
        }
        R3E.Data.DriverData leader = leader_.Value;
        if (leader.FinishStatus == 1) {
            return fraction;
        }
        if (data.SessionTimeRemaining != -1) {
            double referenceLap;
            
            if (data.LapTimeBestLeader > 0 && leader.CompletedLaps > 1) {
                referenceLap = data.LapTimeBestLeader;
            } else if (data.LapTimeBestSelf > 0) {
                referenceLap = data.LapTimeBestSelf;
            } else {
                referenceLap = combination.GetBestLapTime();
                if (referenceLap == -1) {
                    return -1;
                }
            }
            double leaderFraction = leader.LapDistance / data.LayoutLength;
            return Math.Ceiling(data.SessionTimeRemaining / referenceLap + leaderFraction) - fraction +
                    (leaderFraction < fraction ? 1 : 0) +
                    (data.SessionLengthFormat == 2 ? 1 : 0);
        } else {
            int sessionLaps = data.NumberOfLaps;
            if (sessionLaps == -1) {
                return -1;
            }

            int completedLaps = GetLeader(data)?.CompletedLaps ?? -1;
            if (completedLaps == -1) {
                return -1;
            }
            return sessionLaps - completedLaps - fraction;
        }
    }

    private R3E.Data.DriverData? GetLeader(R3E.Data.Shared data) {
        foreach (R3E.Data.DriverData leader in data.DriverData)
        {
            if (leader.Place == 1)
            {
                return leader;
            }
        }
        return null;
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

        File.WriteAllText(path, JsonConvert.SerializeObject(userData));
        lastFuel = data.FuelLeft;
    }
}
