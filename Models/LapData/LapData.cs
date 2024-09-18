using System.Collections;
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

        public abstract IEnumerable Entries { get; }

        public override abstract bool Equals(object? obj);
        public override abstract int GetHashCode();

        public static bool operator ==(Context? lhs, Context? rhs)
        {
            if (lhs is null)
            {
                return rhs is null;
            }
            return lhs.Equals(rhs);
        }

        public static bool operator !=(Context? lhs, Context? rhs)
        {
            if (lhs is null)
            {
                return rhs is not null;
            }
            return !(lhs == rhs);
        }
    }

    public abstract class Context<T> : Context where T : class, IEntityWithContext<Context<T>>
    {
        public override ICollection<T> Entries { get; } = new List<T>();
    }

    public class LapContext : Context<LapData> {
        public int TrackLayoutId { get; set; }
        public int CarId { get; set; }
        public int ClassPerformanceIndex { get; set; }
        public R3E.Constant.TireSubtype TireCompoundFront { get; set; }
        public R3E.Constant.TireSubtype TireCompoundRear { get; set; }

        public int? BestLapId { get; set; }
        [NotMapped]
        public LapData? BestLap => Entries.FirstOrDefault(l => l.Id == BestLapId);

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

        [Obsolete("EF Core only")]
        public LapContext() { }
        public LapContext(int trackLayoutId, int carId, int classPerformanceIndex, R3E.Constant.TireSubtype tireCompoundFront, R3E.Constant.TireSubtype tireCompoundRear)
        {
            TrackLayoutId = trackLayoutId;
            CarId = carId;
            ClassPerformanceIndex = classPerformanceIndex;
            TireCompoundFront = tireCompoundFront;
            TireCompoundRear = tireCompoundRear;
        }
        public LapContext(int trackLayoutId, int carId, int classPerformanceIndex, int tireCompoundFront, int tireCompoundRear) : this(trackLayoutId, carId, classPerformanceIndex, (R3E.Constant.TireSubtype)tireCompoundFront, (R3E.Constant.TireSubtype)tireCompoundRear) { }

        public override bool Equals(object? obj)
        {
            if (obj == null || GetType() != obj.GetType())
            {
                return false;
            }
            
            LapContext other = (LapContext)obj;
            return TrackLayoutId == other.TrackLayoutId && CarId == other.CarId && ClassPerformanceIndex == other.ClassPerformanceIndex && TireCompoundFront == other.TireCompoundFront && TireCompoundRear == other.TireCompoundRear;
        }
        
        public override int GetHashCode()
        {
            return HashCode.Combine(TrackLayoutId, CarId, ClassPerformanceIndex, TireCompoundFront, TireCompoundRear);
        }
    }

    public class LapData : EntityWithId, IEntityWithContext<Context<LapData>>
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public DateTime Timestamp { get; set; }
        public bool Valid { get; set; }

        
        public LapContext Context { get; set; }
        [NotMapped]
        Context<LapData> IEntityWithContext<Context<LapData>>.Context => Context;

        private LapTime _lapTime;
        public LapTime LapTime {
            get => _lapTime;
            set {
                _lapTime = value;
                _lapTime.Lap = this;
            }
        }

        private TireWear? _tireWear;
        public TireWear? TireWear {
            get => _tireWear;
            set {
                _tireWear = value;
                if (value != null) value.Lap = this;
            }
        }

        private FuelUsage? _fuelUsage;
        public FuelUsage? FuelUsage {
            get => _fuelUsage;
            set {
                _fuelUsage = value;
                if (value != null) value.Lap = this;
            }
        }

        private Telemetry? _telemetry;
        public Telemetry? Telemetry {
            get => _telemetry;
            set {
                _telemetry = value;
                if (value != null) value.Lap = this;
            }
        }

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


        [Obsolete("EF Core only")]
        public LapData() { }
        public LapData(LapContext context, bool valid, LapTime lapTime)
        {
            Timestamp = DateTime.Now;
            Context = context;
            Valid = valid;
            LapTime = lapTime;
        }

        public LapData(LapContext context, bool valid, LapTime lapTime, TireWear? tireWear, FuelUsage? fuelUsage, Telemetry? telemetry) : this(context, valid, lapTime)
        {
            TireWear = tireWear;
            FuelUsage = fuelUsage;
            Telemetry = telemetry;
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
    public abstract class LapPointer : EntityWithId, IEntityWithContext<Context?>
    {
        public LapData Lap { get; set; }
        public bool PendingRemoval { get; set; } = false;

        [NotMapped]
        public LapContext LapContext => Lap.Context;

        [NotMapped]
        public virtual Context? Context => null;

        [Obsolete("EF Core only")]
        protected LapPointer() { }

        protected LapPointer(LapData lap)
        {
            Lap = lap;
        }
    }

    [NotMapped]
    public abstract class LapPointer<T, V> : LapPointer, IEntityWithContext<Context<T>?> where T : LapPointer<T, V>
    {
        public V Value { get; set; }

        [NotMapped]
        public override Context<T>? Context => null;

        [Obsolete("EF Core only")]
        protected LapPointer() { }
        protected LapPointer(LapData lap, V value) : base(lap)
        {
            Value = value;
        }
    }

    public interface ITypedContextPointer<C> where C : Context
    {
        public C TypedContext { get; set; }
    }

    [NotMapped]
    public abstract class LapPointer<C, T, V> : LapPointer<T, V>, IEntityWithContext<Context<T>>, ITypedContextPointer<C> where C : Context<T> where T : LapPointer<C, T, V>
    {
        [NotMapped]
        public override Context<T> Context => TypedContext;
        public C TypedContext { get; set; }

        [Obsolete("EF Core only")]
        protected LapPointer() { }
        protected LapPointer(LapData lap, C context, V value) : base(lap, value)
        {
            TypedContext = context;
        }
    }

    public class LapTime : LapPointer<LapTime, double> {
        [Obsolete("EF Core only")]
        public LapTime() { }
        public LapTime(LapData lap, double value) : base(lap, value) { }
    }

    public class TireWearContext : Context<TireWear> {
        public int TireWearRate { get; }

        [Obsolete("EF Core only")]
        public TireWearContext() { }
        public TireWearContext(int tireWearRate)
        {
            TireWearRate = tireWearRate;
        }

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
    public class TireWear : LapPointer<TireWearContext, TireWear, TireWearObj> {
        [Obsolete("EF Core only")]
        public TireWear() { }
        public TireWear(LapData lap, TireWearContext context, TireWearObj value) : base(lap, context, value) { }
    }

    public class FuelUsageContext : Context<FuelUsage> {
        public int FuelUsageRate { get; }

        [Obsolete("EF Core only")]
        public FuelUsageContext() { }
        public FuelUsageContext(int fuelUsageRate)
        {
            FuelUsageRate = fuelUsageRate;
        }

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
    public class FuelUsage : LapPointer<FuelUsageContext, FuelUsage, double> {
        [Obsolete("EF Core only")]
        public FuelUsage() { }
        public FuelUsage(LapData lap, FuelUsageContext context, double value) : base(lap, context, value) { }
    }

    public class Telemetry : LapPointer<Telemetry, TelemetryObj> {
        [Obsolete("EF Core only")]
        public Telemetry() { }
        public Telemetry(LapData lap, TelemetryObj value) : base(lap, value) { }
    }


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

        [Obsolete("EF Core only")]
        public TelemetryObj() { }
        public TelemetryObj(double[] points, double pointsPerMeter)
        {
            Points = points;
            PointsPerMeter = pointsPerMeter;
        }
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