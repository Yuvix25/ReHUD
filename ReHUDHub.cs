using Microsoft.AspNetCore.SignalR;
using ReHUD;

namespace SignalRChat.Hubs
{
    public class ReHUDHub : Hub
    {
        public void Log(string level, double startTimestamp, double endTimestamp, string message)
        {
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
                        case "warn":
                            Startup.logger.Warn(logMessage);
                            break;
                        case "error":
                            Startup.logger.Error(logMessage);
                            break;
                        default:
                            Startup.logger.Info(logMessage);
                            break;
                    }
                }
            } catch (Exception e) {
                Console.WriteLine(e);
            }
        }
    }
}