using ElectronNET.API;
using System.Diagnostics;

namespace ReHUD;

public static class Program
{
    public static void Main(string[] args)
    {
#if DEBUG
        Debugger.Launch();
#endif
        try
        {
            CreateWebHostBuilder(args).Build().Run();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
    }

    public static IHostBuilder CreateWebHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureWebHostDefaults(webBuilder =>
            {
                Console.WriteLine("Configuring Web Host Defaults");
                webBuilder.UseElectron(args);
#if DEBUG
                webBuilder.UseEnvironment(Environments.Development);
#endif
                webBuilder.UseStartup<Startup>();
            }).ConfigureLogging((hostingContext, logging) =>
            {
                logging.ClearProviders();
                logging.AddConsole();
                logging.AddDebug();
                logging.AddEventSourceLogger();
                logging.AddFilter("Microsoft", LogLevel.Warning)
                        .AddFilter("System", LogLevel.Warning)
                        .AddFilter("LoggingConsoleApp.Program", LogLevel.Debug);
            });
}
