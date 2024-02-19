using ElectronNET.API;

namespace ReHUD;

public static class Program
{
    public static void Main(string[] args)
    {
        CreateWebHostBuilder(args).Build().Run();
    }

    public static IHostBuilder CreateWebHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureWebHostDefaults(webBuilder =>
            {
                webBuilder.UseElectron(args);
//#if (DEBUG)
//                webBuilder.UseEnvironment(Environments.Development);
//# endif
                webBuilder.UseStartup<Startup>();
            });
}
