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

        public static bool IsRaceRoomRunning()
        {
            return Process.GetProcessesByName("RRRE").Length > 0 || Process.GetProcessesByName("RRRE64").Length > 0;
        }

        /// <summary>
        /// Returns either the estimated total number of laps and number of laps left, or null if the data is not available. <total, left>
        /// </summary>
        internal static Tuple<int, double> GetEstimatedLapCount(Data.Shared data, FuelCombination combination)
        {
            double fraction = data.LapDistanceFraction == -1 ? 0 : data.LapDistanceFraction;

            double leaderFraction;
            int leaderCompletedLaps;

            Data.DriverData? leader_ = GetLeader(data);
            if (leader_ == null)
            {
                leaderFraction = fraction;
                leaderCompletedLaps = data.CompletedLaps;
            }
            else
            {
                Data.DriverData leader = leader_.Value;
                if (leader.FinishStatus == 1)
                {
                    return new Tuple<int, double>(data.CompletedLaps + 1, 1 - fraction);
                }

                leaderFraction = leader.LapDistance == -1 ? fraction : leader.LapDistance / data.LayoutLength;
                leaderCompletedLaps = GetLeader(data)?.CompletedLaps ?? 0;
                if (leaderCompletedLaps == -1)
                {
                    leaderCompletedLaps = data.CompletedLaps;
                }
            }


            if (leaderFraction == -1 || leaderCompletedLaps == -1)
            {
                return new Tuple<int, double>(-1, -1);
            }


            // number of laps left for the leader
            int res;

            double sessionTime = data.SessionTimeRemaining;
            if (sessionTime != -1)
            {
                double referenceLap;

                if (data.LapTimeBestLeader > 0 && leaderCompletedLaps > 1)
                {
                    referenceLap = data.LapTimeBestLeader;
                }
                else if (data.LapTimeBestSelf > 0 && data.CompletedLaps > 1)
                {
                    referenceLap = data.LapTimeBestSelf;
                }
                else
                {
                    referenceLap = combination.GetBestLapTime();
                    if (referenceLap == -1)
                    {
                        return new Tuple<int, double>(-1, -1);
                    }
                }

                res = (int)Math.Ceiling(sessionTime / referenceLap + leaderFraction);
            }
            else
            {
                int sessionLaps = data.NumberOfLaps;
                if (sessionLaps == -1)
                {
                    return new Tuple<int, double>(-1, -1);
                }

                if (leaderCompletedLaps == -1)
                {
                    return new Tuple<int, double>(sessionLaps, 0);
                }
                res = sessionLaps - leaderCompletedLaps;
            }
            res = res +
                    (leaderFraction < fraction ? 1 : 0) +
                    (data.SessionLengthFormat == 2 ? 1 : 0);

            return new Tuple<int, double>(res + data.CompletedLaps, res - fraction);
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