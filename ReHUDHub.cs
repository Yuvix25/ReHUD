using Microsoft.AspNetCore.SignalR;
using ReHUD;
using ReHUD.Interfaces;
using ReHUD.Services;

namespace SignalRChat.Hubs
{
    public class ReHUDHub : Hub
    {
        public void Log(string level, double startTimestamp, double endTimestamp, string message) {
            try {
                if (startTimestamp != -1) {
                    startTimestamp /= 1000;
                }
                if (endTimestamp != -1) {
                    endTimestamp /= 1000;
                }

                LogMessage logMessage = new(startTimestamp, endTimestamp, message);
                if (Startup.logger != null) {
                    switch (level) {
                        case "WARN":
                            Startup.logger.Warn(logMessage);
                            break;
                        case "ERROR":
                            Startup.logger.Error(logMessage);
                            break;
                        default:
                            Startup.logger.Info(logMessage);
                            break;
                    }
                }
            }
            catch (Exception e) {
                Console.WriteLine(e);
            }
        }


        private IR3EDataService? GetR3EDataService()
        {
            return Context.GetHttpContext()?.RequestServices.GetService<IR3EDataService>();
        }

        public void SaveBestLap(int lapId, double[] points, double pointsPerMeter)
        {
            Startup.logger.InfoFormat("SaveBestLap: lapId={0}, points={1}, pointsPerMeter={2}", lapId, points.Length, pointsPerMeter);
            var r3eDataService = GetR3EDataService();
            if (r3eDataService == null) {
                Startup.logger.Error("SaveBestLap: r3eDataService is null");
                return;
            }

            try {
                r3eDataService.SaveBestLap(lapId, points, pointsPerMeter);
            } catch (Exception e) {
                Startup.logger.Error("SaveBestLap: Failed to save best lap", e);
            }
        }

        public string LoadBestLap(int layoutId, int carId, int classPerformanceIndex)
        {
            Startup.logger.InfoFormat("LoadBestLap: layoutId={0}, carId={1}, classPerformanceIndex={2}", layoutId, carId, classPerformanceIndex);
            var r3eDataService = GetR3EDataService();
            if (r3eDataService == null) {
                Startup.logger.Error("LoadBestLap: r3eDataService is null");
                return "{}";
            }

            try {
                return r3eDataService.LoadBestLap(layoutId, carId, classPerformanceIndex);
            } catch (Exception e) {
                Startup.logger.Error("LoadBestLap: Failed to load best lap", e);
                return "{}";
            }
        }
    }
}