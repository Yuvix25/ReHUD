using System;
// using System.Management;
using System.Diagnostics;

namespace R3E
{
    public class Utilities
    {
        public static Single RpsToRpm(Single rps)
        {
            return rps * (60 / (2 * (Single)Math.PI));
        }

        public static Single MpsToKph(Single mps)
        {
            return mps * 3.6f;
        }

        public static bool IsRrreRunning()
        {
            return Process.GetProcessesByName("RRRE").Length > 0 || Process.GetProcessesByName("RRRE64").Length > 0;
        }

        internal static double GetLapsUntilFinish(Data.Shared data, Combination combination)
        {
            double fraction = data.LapDistanceFraction == -1 ? 0 : data.LapDistanceFraction;
            Data.DriverData? leader_ = GetLeader(data);
            if (leader_ == null)
            {
                return -1;
            }
            Data.DriverData leader = leader_.Value;
            if (leader.FinishStatus == 1)
            {
                return fraction;
            }
            if (data.SessionTimeRemaining != -1)
            {
                double referenceLap;

                if (data.LapTimeBestLeader > 0 && leader.CompletedLaps > 1)
                {
                    referenceLap = data.LapTimeBestLeader;
                }
                else if (data.LapTimeBestSelf > 0)
                {
                    referenceLap = data.LapTimeBestSelf;
                }
                else
                {
                    referenceLap = combination.GetBestLapTime();
                    if (referenceLap == -1)
                    {
                        return -1;
                    }
                }
                double leaderFraction = leader.LapDistance / data.LayoutLength;
                return Math.Ceiling(data.SessionTimeRemaining / referenceLap + leaderFraction) - fraction +
                        (leaderFraction < fraction ? 1 : 0) +
                        (data.SessionLengthFormat == 2 ? 1 : 0);
            }
            else
            {
                int sessionLaps = data.NumberOfLaps;
                if (sessionLaps == -1)
                {
                    return -1;
                }

                int completedLaps = GetLeader(data)?.CompletedLaps ?? -1;
                if (completedLaps == -1)
                {
                    return -1;
                }
                return sessionLaps - completedLaps - fraction;
            }
        }

        internal static Data.DriverData? GetLeader(Data.Shared data)
        {
            foreach (Data.DriverData leader in data.DriverData)
            {
                if (leader.Place == 1)
                {
                    return leader;
                }
            }
            return null;
        }
    }
}