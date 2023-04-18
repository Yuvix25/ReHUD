using ElectronNET.API;

namespace ReHUD;

public class Program
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
                // webBuilder.UseEnvironment(Environments.Development);
                webBuilder.UseStartup<Startup>();
            });
}
