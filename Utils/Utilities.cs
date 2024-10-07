using Newtonsoft.Json;
using R3E.Data;
using ReHUD.Models;
using System.Diagnostics;

namespace ReHUD.Utils
{
    public static class Utilities
    {
        public static List<Tuple<DriverData, DriverData>> GetDriverMatches(DriverData[] oldData, DriverData[] newData) {
            var oldUids = new Dictionary<string, DriverData>();
            foreach (var driver in oldData) {
                oldUids[Driver.GetDriverUid(driver.driverInfo)] = driver;
            }

            var res = new List<Tuple<DriverData, DriverData>>();
            foreach (var driver in newData) {
                string uid = Driver.GetDriverUid(driver.driverInfo);
                DriverData? oldDriver = oldUids.GetValueOrDefault(uid);
                if (oldDriver != null) {
                    res.Add(new(oldDriver.Value, driver));
                }
            }
            return res;
        }

        public static float RpsToRpm(float rps) {
            return rps * (60 / (2 * (float)Math.PI));
        }

        public static float MpsToKph(float mps) {
            return mps * 3.6f;
        }

        public static bool IsRaceRoomRunning() {
            return Process.GetProcessesByName("RRRE").Length > 0 || Process.GetProcessesByName("RRRE64").Length > 0;
        }

        /// <summary>
        /// Returns either the estimated total number of laps and number of laps left, or null if the data is not available. <total, left>
        /// </summary>
        internal static Tuple<int?, double?> GetEstimatedLapCount(R3EData data, double? bestLaptime) {
            double fraction = data.lapDistanceFraction;

            double leaderFraction = fraction;
            double leaderCurrentLaptime = data.lapTimeCurrentSelf;
            int leaderCompletedLaps = data.completedLaps;

            DriverData? leader_ = GetLeader(data);
            if (leader_ != null) {
                DriverData leader = leader_.Value;
                if (leader.finishStatus == 1) {
                    return new(data.completedLaps + 1, 1 - fraction);
                }

                if (leader.completedLaps != -1) {
                    leaderCompletedLaps = leader.completedLaps;
                }

                leaderCurrentLaptime = leader.lapTimeCurrentSelf;
                leaderFraction = -1;
                if (leader.lapDistance != -1 && data.layoutLength != -1) {
                    leaderFraction = leader.lapDistance / data.layoutLength;
                }
            }


            if (leaderCompletedLaps == -1 || leaderCompletedLaps == -1 && leaderFraction == -1) {
                return new(null, null);
            }


            // number of laps left for the leader
            int res;

            double sessionTimeRemaining = data.sessionTimeRemaining;
            if (sessionTimeRemaining != -1) {
                double referenceLap;

                if (data.lapTimeBestLeader > 0 && leaderCompletedLaps > 1) {
                    referenceLap = data.lapTimeBestLeader;
                }
                else if (data.lapTimeBestSelf > 0 && data.completedLaps > 1) {
                    referenceLap = data.lapTimeBestSelf;
                }
                else {
                    if (bestLaptime == null) {
                        return new(null, null);
                    }
                    referenceLap = bestLaptime.Value;
                }

                if (leaderCurrentLaptime != -1) {
                    res = (int)Math.Ceiling((sessionTimeRemaining + leaderCurrentLaptime) / referenceLap);
                }
                else {
                    res = (int)Math.Ceiling(sessionTimeRemaining / referenceLap + leaderFraction);
                }
            }
            else {
                int sessionLaps = data.numberOfLaps;
                if (sessionLaps == -1) {
                    return new(null, null);
                }

                if (leaderCompletedLaps == -1) {
                    return new(sessionLaps, 0);
                }
                res = sessionLaps - leaderCompletedLaps;
            }
            res = res +
                    (leaderFraction < fraction ? 1 : 0) +
                    (data.sessionLengthFormat == 2 ? 1 : 0);

            return new(res + data.completedLaps, res - fraction);
        }

        internal static DriverData? GetLeader(R3EData data) {
            foreach (DriverData leader in data.driverData) {
                if (leader.place == 1) {
                    return leader;
                }
            }
            return null;
        }

        public static long SafeCastToLong(object value) {
            if (value is int v) {
                return v;
            }
            else if (value is long v1) {
                return v1;
            }
            else if (value is uint v2) {
                return v2;
            }
            else if (value is ulong v3) {
                return (long)v3;
            }
            else {
                throw new InvalidCastException($"Cannot cast {value.GetType()} to long");
            }
        }
    }
}