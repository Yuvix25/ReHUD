using Microsoft.AspNetCore.SignalR;
using ReHUD;

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

        public void SaveBestLap(int layoutId, int classId, double laptime, double[] points, double pointsPerMeter)
        {
            Startup.logger.Info($"SaveBestLap: layoutId={layoutId}, classId={classId}, laptime={laptime}, points={points.Length}, pointsPerMeter={pointsPerMeter}");
            Startup.SaveBestLap(layoutId, classId, laptime, points, pointsPerMeter);
        }

        public string LoadBestLap(int layoutId, int classId)
        {
            return Startup.LoadBestLap(layoutId, classId);
        }
    }
}