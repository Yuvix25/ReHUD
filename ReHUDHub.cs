using Microsoft.AspNetCore.SignalR;
using ReHUD;
using ReHUD.Interfaces;

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

        public void SaveBestLap(int layoutId, int classId, double laptime, double[] points, double pointsPerMeter)
        {
            Startup.logger.InfoFormat("SaveBestLap: layoutId={0}, classId={1}, laptime={2}, points={3}, pointsPerMeter={4}", layoutId, classId, laptime, points.Length, pointsPerMeter);
            var r3eDataService = GetR3EDataService();
            if (r3eDataService == null) {
                Startup.logger.Error("SaveBestLap: r3eDataService is null");
                return;
            }
            r3eDataService.SaveBestLap(layoutId, classId, laptime, points, pointsPerMeter);
        }

        public string LoadBestLap(int layoutId, int classId)
        {
            Startup.logger.InfoFormat("LoadBestLap: layoutId={0}, classId={1}", layoutId, classId);
            var r3eDataService = GetR3EDataService();
            if (r3eDataService == null) {
                Startup.logger.Error("LoadBestLap: r3eDataService is null");
                return "{}";
            }
            return r3eDataService.LoadBestLap(layoutId, classId);
        }
    }
}