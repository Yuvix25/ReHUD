using ElectronNET.API;
using ElectronNET.API.Entities;

namespace R3E_Electron_Overlay;

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
        Electron.App.CommandLine.AppendSwitch("disable-gpu");

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
            Electron.App.Ready += () => CreateWindow();
            // CreateWindow();
        }
    }

    private async void CreateWindow() {
        Electron.App.CommandLine.AppendSwitch("enable-transparent-visuals");
        Electron.App.CommandLine.AppendSwitch("disable-gpu-compositing");

        var window = await Electron.WindowManager.CreateWindowAsync(new BrowserWindowOptions()
        {
            Resizable = false,
            Fullscreen = true,
            Minimizable = false,
            Movable = false,
            Frame = false,
            Transparent = true,
            BackgroundColor = "#00000000",
        });
        window.SetAlwaysOnTop(true, OnTopLevel.screenSaver);
        window.SetIgnoreMouseEvents(true);

        using (var memory = new R3E.SharedMemory())
        {
            Thread thread = new Thread(() => memory.Run((data) =>
            {
                Electron.IpcMain.Send(window, "data", data);

                return;
                if (data.GameInMenus == 1 || data.GameInReplay == 1 || data.GamePaused == 1) {
                    window.Hide();
                } else {
                    window.Show();
                }
            }));
            thread.Start();
        }

        window.OnClosed += () => Electron.App.Quit();
    }
}
