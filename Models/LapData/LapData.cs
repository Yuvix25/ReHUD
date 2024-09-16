using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Newtonsoft.Json;

namespace ReHUD.Models.LapData
{
    public class EntityWithId
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Key]
        public virtual int Id { get; set; }
    }

    public interface IEntityWithContext<C> where C : Context?
    {
        public C Context { get; }
    }


    public abstract class Context : EntityWithId
    {
        [Key]
        public override int Id => GetHashCode();

        public override abstract bool Equals(object? obj);
        public override abstract int GetHashCode();

        public static bool operator ==(Context lhs, Context rhs)
        {
            return lhs.Equals(rhs);
        }

        public static bool operator !=(Context lhs, Context rhs)
        {
            return !(lhs == rhs);
        }
    }

    public abstract class Context<T> : Context where T : class, IEntityWithContext<Context<T>?>
    {
        public ICollection<T> Entries { get; } = new List<T>();
    }

    public class LapContext : Context<LapData> {
        public int TrackLayoutId { get; set; }
        public int CarId { get; set; }
        public int ClassPerformanceIndex { get; set; }
        public R3E.Constant.TireSubtype TireCompound { get; set; }

        public LapData? BestLap { get; set; }

        [NotMapped]
        public IEnumerable<LapTime> LapTimes => Entries.Where(l => l.LapTime != null).Select(l => l.LapTime);
        [NotMapped]
        public IEnumerable<TireWear> TireWears => Entries.Where(l => l.TireWear != null).Select(l => l.TireWear!);
        [NotMapped]
        public IEnumerable<FuelUsage> FuelUsages => Entries.Where(l => l.FuelUsage != null).Select(l => l.FuelUsage!);

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

        public override bool Equals(object? obj)
        {
            if (obj == null || GetType() != obj.GetType())
            {
                return false;
            }
            
            LapContext other = (LapContext)obj;
            return TrackLayoutId == other.TrackLayoutId && CarId == other.CarId && ClassPerformanceIndex == other.ClassPerformanceIndex && TireCompound == other.TireCompound;
        }
        
        public override int GetHashCode()
        {
            return HashCode.Combine(TrackLayoutId, CarId, ClassPerformanceIndex, TireCompound);
        }
    }

    public class LapData : EntityWithId, IEntityWithContext<LapContext>, IEntityWithContext<Context<LapData>?>
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public DateTime Timestamp { get; set; }
        public bool Valid { get; set; }

        public LapContext Context { get; }
        Context<LapData> IEntityWithContext<Context<LapData>?>.Context => Context;

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
        public LapContext LapContext => Lap.Context;
    }


    [NotMapped]
    public abstract class LapPointer<C, T, V> : LapPointer, IEntityWithContext<C?> where C : Context<T> where T : LapPointer<C, T, V>, IEntityWithContext<Context<T>?>
    {
        public V Value { get; set; }

        public virtual C? Context => null;
    }

    public class LapTime : LapPointer<Context<LapTime>, LapTime, double>, IEntityWithContext<Context<LapTime>?> { }

    public class TireWearContext : Context<TireWear> {
        public int TireWearRate { get; set; }

        public override bool Equals(object? obj)
        {
            if (obj == null || GetType() != obj.GetType())
            {
                return false;
            }
            
            TireWearContext other = (TireWearContext)obj;
            return TireWearRate == other.TireWearRate;
        }
        
        public override int GetHashCode()
        {
            return HashCode.Combine(TireWearRate);
        }
    }
    public class TireWear : LapPointer<TireWearContext, TireWear, TireWearObj>, IEntityWithContext<Context<TireWear>?> {
        Context<TireWear>? IEntityWithContext<Context<TireWear>?>.Context => Context;
    }

    public class FuelUsageContext : Context<FuelUsage> {
        public int FuelUsageRate { get; set; }

        public override bool Equals(object? obj)
        {
            if (obj == null || GetType() != obj.GetType())
            {
                return false;
            }
            
            FuelUsageContext other = (FuelUsageContext)obj;
            return FuelUsageRate == other.FuelUsageRate;
        }
        
        public override int GetHashCode()
        {
            return HashCode.Combine(FuelUsageRate);
        }
    }
    public class FuelUsage : LapPointer<FuelUsageContext, FuelUsage, double>, IEntityWithContext<Context<FuelUsage>?> {
        Context<FuelUsage>? IEntityWithContext<Context<FuelUsage>?>.Context => Context;
    }

    public class Telemetry : LapPointer<Context<Telemetry>, Telemetry, TelemetryObj> { }


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

        /// <summary>
        /// Serialized array of points for the database.
        /// Should not be used directly, use <see cref="Points"/> instead.
        /// </summary>
        public string InternalPoints { get; set; }

        [NotMapped]
        public double[] Points
        {
            get
            {
                return Array.ConvertAll(InternalPoints.Split(';'), double.Parse);
            }
            set
            {
                InternalPoints = string.Join(";", value.Select(p => p.ToString()).ToArray());
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