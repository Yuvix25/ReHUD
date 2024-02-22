using System.Diagnostics;
using R3E.Data;
using ReHUD.Models;

namespace ReHUD.Utils
{
    public static class Utilities
    {
        public static float RpsToRpm(float rps)
        {
            return rps * (60 / (2 * (float)Math.PI));
        }

        public static float MpsToKph(float mps)
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
        internal static Tuple<int, double> GetEstimatedLapCount(R3eData data, FuelCombination combination)
        {
            double fraction = data.lapDistanceFraction;

            double leaderFraction = fraction;
            double leaderCurrentLaptime = data.lapTimeCurrentSelf;
            int leaderCompletedLaps = data.completedLaps;

            DriverData? leader_ = GetLeader(data);
            if (leader_ != null)
            {
                DriverData leader = leader_.Value;
                if (leader.finishStatus == 1)
                {
                    return new Tuple<int, double>(data.completedLaps + 1, 1 - fraction);
                }

                if (leader.completedLaps != -1)
                {
                    leaderCompletedLaps = leader.completedLaps;
                }

                leaderCurrentLaptime = leader.lapTimeCurrentSelf;
                leaderFraction = -1;
                if (leader.lapDistance != -1 && data.layoutLength != -1)
                {
                    leaderFraction = leader.lapDistance / data.layoutLength;
                }
            }


            if (leaderCompletedLaps == -1 || leaderCompletedLaps == -1 && leaderFraction == -1)
            {
                return new Tuple<int, double>(-1, -1);
            }


            // number of laps left for the leader
            int res;

            double sessionTimeRemaining = data.sessionTimeRemaining;
            if (sessionTimeRemaining != -1)
            {
                double referenceLap;

                if (data.lapTimeBestLeader > 0 && leaderCompletedLaps > 1)
                {
                    referenceLap = data.lapTimeBestLeader;
                }
                else if (data.lapTimeBestSelf > 0 && data.completedLaps > 1)
                {
                    referenceLap = data.lapTimeBestSelf;
                }
                else
                {
                    referenceLap = combination.GetBestLapTime();
                    if (referenceLap == -1)
                    {
                        return new Tuple<int, double>(-1, -1);
                    }
                }

                if (leaderCurrentLaptime != -1)
                {
                    res = (int)Math.Ceiling((sessionTimeRemaining + leaderCurrentLaptime) / referenceLap);
                }
                else
                {
                    res = (int)Math.Ceiling(sessionTimeRemaining / referenceLap + leaderFraction);
                }
            }
            else
            {
                int sessionLaps = data.numberOfLaps;
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
                    (data.sessionLengthFormat == 2 ? 1 : 0);

            return new Tuple<int, double>(res + data.completedLaps, res - fraction);
        }

        internal static DriverData? GetLeader(R3eData data)
        {
            foreach (DriverData leader in data.driverData)
            {
                if (leader.place == 1)
                {
                    return leader;
                }
            }
            return null;
        }
    }
}