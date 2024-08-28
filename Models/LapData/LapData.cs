using System.ComponentModel.DataAnnotations.Schema;

namespace ReHUD.Models.LapData
{
    public class EntityWithId {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
    }

    public class LapContext : EntityWithId {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public DateTime Timestamp { get; set; }
        public int TrackLayoutId { get; set; }
        public int CarId { get; set; }
        public int ClassPerformanceIndex { get; set; }
        public bool Valid { get; set; }

        public LapLog? LapLog { get; set; }
        public TireWearLog? TireWearLog { get; set; }
        public FuelUsageLog? FuelUsageLog { get; set; }
    }

    [NotMapped]
    public class LogWithContext {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; private set; }
        public LapContext Context { get; set; }
    }

    public class LapLog : LogWithContext
    {
        public double LapTime { get; set; }
        public TireWear? TireWear { get; set; }
        public double? FuelUsage { get; set; }
    }

    public class LapLogWithTelemetry : LapLog
    {
        public LapTelemetry LapTelemetry { get; set; }
    }

    public class TireWearLog : LogWithContext
    {
        public TireWear TireWear { get; set; }
    }

    public class FuelUsageLog : LogWithContext
    {
        public double FuelUsage { get; set; }
    }


    public class TireWear
    {
        public double FrontLeft { get; set; }
        public double FrontRight { get; set; }
        public double RearLeft { get; set; }
        public double RearRight { get; set; }


        public static TireWear operator +(TireWear a, TireWear b)
        {
            return new TireWear
            {
                FrontLeft = a.FrontLeft + b.FrontLeft,
                FrontRight = a.FrontRight + b.FrontRight,
                RearLeft = a.RearLeft + b.RearLeft,
                RearRight = a.RearRight + b.RearRight,
            };
        }

        public static TireWear operator -(TireWear a, TireWear b)
        {
            return new TireWear
            {
                FrontLeft = a.FrontLeft - b.FrontLeft,
                FrontRight = a.FrontRight - b.FrontRight,
                RearLeft = a.RearLeft - b.RearLeft,
                RearRight = a.RearRight - b.RearRight,
            };
        }

        public static TireWear operator /(TireWear a, double b)
        {
            return new TireWear
            {
                FrontLeft = a.FrontLeft / b,
                FrontRight = a.FrontRight / b,
                RearLeft = a.RearLeft / b,
                RearRight = a.RearRight / b,
            };
        }

        public static TireWear operator *(TireWear a, double b)
        {
            return new TireWear
            {
                FrontLeft = a.FrontLeft * b,
                FrontRight = a.FrontRight * b,
                RearLeft = a.RearLeft * b,
                RearRight = a.RearRight * b,
            };
        }
    }


    public class LapTelemetry
    {
        public string InternalLapPoints { get; set; }

        [NotMapped]
        public double[] LapPoints
        {
            get
            {
                return Array.ConvertAll(InternalLapPoints.Split(';'), double.Parse);
            }
            set
            {
                InternalLapPoints = string.Join(";", value.Select(p => p.ToString()).ToArray());
            }
        }

        public double PointsPerMeter { get; set; }
    }


    public class CombinationSummary {
        public int TrackLayoutId { get; init; }
        public int CarId { get; init; }
        public int ClassPerformanceIndex { get; init; }

        public double? AverageLapTime { get; set; }
        public TireWear? AverageTireWear { get; set; }
        public double? AverageFuelUsage { get; set; }

        public double? LastLapTime { get; set; }
        public TireWear? LastTireWear { get; set; }
        public double? LastFuelUsage { get; set; }

        public double? BestLapTime { get; set; }
    }
}