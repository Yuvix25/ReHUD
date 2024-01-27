using log4net.Core;
using ReHUD;

namespace log4net.Appender {
    public class FloodRollingAppender : RollingFileAppender {
        public static void ProcessLoggingEvent(LoggingEvent loggingEvent) {
            if (loggingEvent.MessageObject is LogMessage logMessage)
            {
                loggingEvent.Properties["StartTimestamp"] = logMessage.StartTime;
                loggingEvent.Properties["EndTimestamp"] = logMessage.EndTime == "" ? "" : " to " + logMessage.EndTime;
                loggingEvent.Properties["Message"] = logMessage.Message;
            }
            else
            {
                loggingEvent.Properties["StartTimestamp"] = DateTime.Now.ToString(LogMessage.timeFormat);
                loggingEvent.Properties["EndTimestamp"] = "";
                loggingEvent.Properties["Message"] = loggingEvent.MessageObject;
            }
        }
        protected override void Append(LoggingEvent loggingEvent) {
            ProcessLoggingEvent(loggingEvent);
            base.Append(loggingEvent);
        }
    }

    public class FloodConsoleAppender : ConsoleAppender {
        protected override void Append(LoggingEvent loggingEvent) {
            FloodRollingAppender.ProcessLoggingEvent(loggingEvent);
            base.Append(loggingEvent);
        }
    }
}

namespace ReHUD {
    public class LogMessage
    {
        public static readonly string timeFormat = "yyyy-MM-dd HH:mm:ss.fff";
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public string Message { get; set; }

        public LogMessage(double startTimestamp, double endTimestamp, string message)
        {
            var startTime = GetTimeString(startTimestamp, true);
            var endTime = GetTimeString(endTimestamp);

            StartTime = startTime;
            EndTime = endTime;
            Message = message;
        }

        public static string GetTimeString(double timestamp, bool useNow = false) {
            if (timestamp == -1) {
                if (useNow) {
                    return DateTime.Now.ToString(timeFormat);
                } else {
                    return "";
                }
            } else {
                return UnixTimeStampToDateTime(timestamp).ToString(timeFormat);
            }
        }

        public static DateTime UnixTimeStampToDateTime(double unixTimeStamp)
        {
            // Unix timestamp is seconds past epoch
            DateTime dateTime = DateTime.UnixEpoch;
            dateTime = dateTime.AddSeconds(unixTimeStamp).ToLocalTime();
            return dateTime;
        }
    }
}
