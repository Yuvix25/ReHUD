using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Newtonsoft.Json;

namespace ReHUD.Models.LapData
{
    public class EntityWithId
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Key]
        public int Id { get; set; }
    }

    public interface IEntityWithContext
    {
        public LapContext Context { get; set; }
    }

    public class LapContext {
        public int TrackLayoutId { get; set; }
        public int CarId { get; set; }
        public int ClassPerformanceIndex { get; set; }

        public ICollection<LapData> Laps { get; } = new List<LapData>();
        public LapData? BestLap { get; set; }

        [NotMapped]
        public IEnumerable<LapTime> LapTimes => Laps.Select(l => l.LapTime);
        [NotMapped]
        public IEnumerable<TireWear> TireWears => Laps.Where(l => l.TireWear != null).Select(l => l.TireWear!);
        [NotMapped]
        public IEnumerable<FuelUsage> FuelUsages => Laps.Where(l => l.FuelUsage != null).Select(l => l.FuelUsage!);

        [NotMapped]
        public List<LapPointer> Pointers
        {
            get
            {
                List<LapPointer> pointers = new();
                pointers.AddRange(LapTimes);
                pointers.AddRange(TireWears);
                pointers.AddRange(FuelUsages);
                if (BestLap != null && BestLap.Telemetry != null) pointers.Add(BestLap.Telemetry);
                return pointers;
            }
        }
    }

    public class LapData : EntityWithId, IEntityWithContext
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public DateTime Timestamp { get; set; }
        public bool Valid { get; set; }

        public LapContext Context { get; set; }

        public LapTime LapTime { get; set; }
        public TireWear? TireWear { get; set; }
        public FuelUsage? FuelUsage { get; set; }
        public Telemetry? Telemetry { get; set; }

        [NotMapped]
        public List<LapPointer> Pointers
        {
            get
            {
                List<LapPointer> pointers = new();
                pointers.Add(LapTime);
                if (TireWear != null) pointers.Add(TireWear);
                if (FuelUsage != null) pointers.Add(FuelUsage);
                if (Telemetry != null) pointers.Add(Telemetry);
                return pointers;
            }
        }

        public string SerializeForBestLap()
        {
            if (Telemetry == null) return "{}";
            return JsonConvert.SerializeObject(new
            {
                lapTime = LapTime.Value,
                lapPoints = Telemetry.Value.Points,
                pointsPerMeter = Telemetry.Value.PointsPerMeter
            });
        }
    }


    [NotMapped]
    public abstract class LapPointer : EntityWithId
    {
        public LapData Lap { get; set; }
        public bool PendingRemoval { get; set; }

        [NotMapped]
        public LapContext Context => Lap.Context;
    }

    [NotMapped]
    public abstract class ValuedLapPointer<T> : LapPointer
    {
        public T Value { get; set; }
    }

    public class LapTime : ValuedLapPointer<double> { }
    public class TireWear : ValuedLapPointer<TireWearObj> { }
    public class FuelUsage : ValuedLapPointer<double> { }
    public class Telemetry : ValuedLapPointer<TelemetryObj> { }


    public class TireWearObj
    {
        public double FrontLeft { get; set; }
        public double FrontRight { get; set; }
        public double RearLeft { get; set; }
        public double RearRight { get; set; }


        public static TireWearObj operator +(TireWearObj a, TireWearObj b)
        {
            return new TireWearObj
            {
                FrontLeft = a.FrontLeft + b.FrontLeft,
                FrontRight = a.FrontRight + b.FrontRight,
                RearLeft = a.RearLeft + b.RearLeft,
                RearRight = a.RearRight + b.RearRight,
            };
        }

        public static TireWearObj operator -(TireWearObj a, TireWearObj b)
        {
            return new TireWearObj
            {
                FrontLeft = a.FrontLeft - b.FrontLeft,
                FrontRight = a.FrontRight - b.FrontRight,
                RearLeft = a.RearLeft - b.RearLeft,
                RearRight = a.RearRight - b.RearRight,
            };
        }

        public static TireWearObj operator /(TireWearObj a, double b)
        {
            return new TireWearObj
            {
                FrontLeft = a.FrontLeft / b,
                FrontRight = a.FrontRight / b,
                RearLeft = a.RearLeft / b,
                RearRight = a.RearRight / b,
            };
        }

        public static TireWearObj operator *(TireWearObj a, double b)
        {
            return new TireWearObj
            {
                FrontLeft = a.FrontLeft * b,
                FrontRight = a.FrontRight * b,
                RearLeft = a.RearLeft * b,
                RearRight = a.RearRight * b,
            };
        }
    }

    public class TelemetryObj {
        private string InternalLapPoints { get; set; }

        [NotMapped]
        public double[] Points
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


    public class CombinationSummary
    {
        public int TrackLayoutId { get; init; }
        public int CarId { get; init; }
        public int ClassPerformanceIndex { get; init; }

        public double? AverageLapTime { get; set; }
        public TireWearObj? AverageTireWear { get; set; }
        public double? AverageFuelUsage { get; set; }

        public double? LastLapTime { get; set; }
        public TireWearObj? LastTireWear { get; set; }
        public double? LastFuelUsage { get; set; }

        public double? BestLapTime { get; set; }
    }
}