using System.Collections;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Newtonsoft.Json;

namespace ReHUD.Models.LapData
{
    public interface IEntityWithId {
        [Key]
        public int Id { get; set; }
    }

    public class EntityWithGeneratedId : IEntityWithId
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Key]
        public int Id { get; set; }
    }

    public interface IEntityWithContext
    {
        public Context Context { get; set; }
    }

    public interface IEntityWithContext<C> : IEntityWithContext where C : Context
    {
        public new C Context { get; set; }
        [NotMapped]
        Context IEntityWithContext.Context { get => Context; set => Context = (C)value; }
    }


    public interface IContextQuery
    {
        public bool Matches(Context context);
    }

    public abstract class Context : IEntityWithId, IContextQuery
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int Id { get => GetId(); set {} }

        public abstract IEnumerable Entries { get; }

        public override abstract bool Equals(object? obj);
        public override abstract int GetHashCode();

        protected abstract int GetId();
        public bool Matches(Context context) => Equals(context);

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

    public abstract class Context<T> : Context where T : class, IEntityWithContext
    {
        public override ICollection<T> Entries { get; } = new List<T>();
    }

    public class LapContext : Context<LapData> {
        private static readonly int MAX_R3E_DATA_ID = 20000;
        private static readonly int MAX_TIRE_COMPOUND = 5;

        public int TrackLayoutId { get; set; }
        public int CarId { get; set; }
        public int? ClassPerformanceIndex { get; set; }

        // Tire compounds affect everything (laptimes, tire wear, fuel usage), so they are stored in the lap context and not only in the tire wear context.
        public R3E.Constant.TireSubtype TireCompoundFront { get; set; }
        public R3E.Constant.TireSubtype TireCompoundRear { get; set; }

        public int? BestLapId { get; set; }
        [NotMapped]
        public LapData? BestLap { get => Entries.FirstOrDefault(l => l.Id == BestLapId); set => BestLapId = value?.Id; }

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
        public LapContext(int trackLayoutId, int carId, int? classPerformanceIndex, R3E.Constant.TireSubtype tireCompoundFront, R3E.Constant.TireSubtype tireCompoundRear)
        {
            TrackLayoutId = trackLayoutId;
            CarId = carId;
            ClassPerformanceIndex = classPerformanceIndex;
            TireCompoundFront = tireCompoundFront;
            TireCompoundRear = tireCompoundRear;
        }
        public LapContext(int trackLayoutId, int carId, int? classPerformanceIndex, int tireCompoundFront, int tireCompoundRear) : this(trackLayoutId, carId, classPerformanceIndex, (R3E.Constant.TireSubtype)tireCompoundFront, (R3E.Constant.TireSubtype)tireCompoundRear) { }

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

        protected override int GetId()
        {
            return TrackLayoutId * MAX_R3E_DATA_ID * MAX_R3E_DATA_ID * MAX_TIRE_COMPOUND * MAX_TIRE_COMPOUND + CarId * MAX_R3E_DATA_ID * MAX_TIRE_COMPOUND * MAX_TIRE_COMPOUND + (int)TireCompoundFront * MAX_TIRE_COMPOUND + (int)TireCompoundRear;
        }

        public override string ToString()
        {
            return $"LapContext[Id={Id}, TrackLayoutId={TrackLayoutId}, CarId={CarId}, ClassPerformanceIndex={ClassPerformanceIndex}, TireCompoundFront={TireCompoundFront}, TireCompoundRear={TireCompoundRear}]";
        }
    }

    public class LapContextQuery : IContextQuery
    {
        public int? TrackLayoutId { get; set; }
        public int? CarId { get; set; }
        public int? ClassPerformanceIndex { get; set; }
        public R3E.Constant.TireSubtype? TireCompoundFront { get; set; }
        public R3E.Constant.TireSubtype? TireCompoundRear { get; set; }

        public bool Matches(Context context)
        {
            if (context is not LapContext lapContext) return false;
            if (TrackLayoutId != null && lapContext.TrackLayoutId != TrackLayoutId) return false;
            if (CarId != null && lapContext.CarId != CarId) return false;
            if (ClassPerformanceIndex != null && lapContext.ClassPerformanceIndex != ClassPerformanceIndex) return false;
            if (TireCompoundFront != null && lapContext.TireCompoundFront != TireCompoundFront) return false;
            if (TireCompoundRear != null && lapContext.TireCompoundRear != TireCompoundRear) return false;
            return true;
        }
    }

    public class LapData : EntityWithGeneratedId, IEntityWithContext<LapContext>
    {
        public DateTime Timestamp { get; set; }
        public bool Valid { get; set; }

        public virtual LapContext Context { get; set; }

        private LapTime _lapTime;
        public virtual LapTime LapTime {
            get => _lapTime;
            set {
                _lapTime = value;
                _lapTime.Lap = this;
            }
        }

        private TireWear? _tireWear;
        public virtual TireWear? TireWear {
            get => _tireWear;
            set {
                _tireWear = value;
                if (value != null) value.Lap = this;
            }
        }

        private FuelUsage? _fuelUsage;
        public virtual FuelUsage? FuelUsage {
            get => _fuelUsage;
            set {
                _fuelUsage = value;
                if (value != null) value.Lap = this;
            }
        }

        private Telemetry? _telemetry;
        public virtual Telemetry? Telemetry {
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
        public LapData(LapContext context, bool valid, double lapTime)
        {
            Timestamp = DateTime.Now;
            Context = context;
            Valid = valid;
            LapTime = new LapTime(this, lapTime);
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

        public override string ToString()
        {
            return $"LapData[Id={Id}, Timestamp={Timestamp}, Valid={Valid}, Context={Context.Id}, LapTime={LapTime.Value}, TireWear={TireWear}, FuelUsage={FuelUsage}, Telemetry={Telemetry}]";
        }
    }


    [NotMapped]
    public abstract class LapPointer : EntityWithGeneratedId
    {
        public virtual LapData Lap { get; set; }
        public bool PendingRemoval { get; set; } = false;

        [NotMapped]
        public LapContext LapContext => Lap.Context;

        [Obsolete("EF Core only")]
        protected LapPointer() { }

        protected LapPointer(LapData lap)
        {
            Lap = lap;
        }
    }

    [NotMapped]
    public abstract class LapPointer<V> : LapPointer
    {
        public virtual V Value { get; set; }

        [Obsolete("EF Core only")]
        protected LapPointer() { }
        protected LapPointer(LapData lap, V value) : base(lap)
        {
            Value = value;
        }
    }

    [NotMapped]
    public abstract class LapPointerWithContext<V, C> : LapPointer<V>, IEntityWithContext<C> where C : Context
    {
        public virtual C Context { get; set; }

        [Obsolete("EF Core only")]
        protected LapPointerWithContext() { }
        protected LapPointerWithContext(LapData lap, V value, C context) : base(lap, value)
        {
            Context = context;
        }
    }

    public class LapTime : LapPointer<double> {
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

        protected override int GetId()
        {
            return TireWearRate;
        }
    }

    public class TireWearContextQuery : IContextQuery
    {
        public int? TireWearRate { get; set; }

        public bool Matches(Context context)
        {
            if (context is not TireWearContext tireWearContext) return false;
            if (TireWearRate != null && tireWearContext.TireWearRate != TireWearRate) return false;
            return true;
        }
    }

    public class TireWear : LapPointerWithContext<TireWearObj, TireWearContext> {

        [Obsolete("EF Core only")]
        public TireWear() { }
        public TireWear(LapData lap, TireWearObj value, TireWearContext context) : base(lap, value, context) { }
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

        protected override int GetId()
        {
            return FuelUsageRate;
        }
    }

    public class FuelUsageContextQuery : IContextQuery
    {
        public int? FuelUsageRate { get; set; }

        public bool Matches(Context context)
        {
            if (context is not FuelUsageContext fuelUsageContext) return false;
            if (FuelUsageRate != null && fuelUsageContext.FuelUsageRate != FuelUsageRate) return false;
            return true;
        }
    }

    public class FuelUsage : LapPointerWithContext<double, FuelUsageContext> {
        [Obsolete("EF Core only")]
        public FuelUsage() { }
        public FuelUsage(LapData lap, double value, FuelUsageContext context) : base(lap, value, context) { }
    }

    public class Telemetry : LapPointer<TelemetryObj> {
        [Obsolete("EF Core only")]
        public Telemetry() { }
        public Telemetry(LapData lap, TelemetryObj value) : base(lap, value) { }
    }


    public class TireWearObj
    {
        [JsonProperty("frontLeft")]
        public double FrontLeft { get; set; }

        [JsonProperty("frontRight")]
        public double FrontRight { get; set; }

        [JsonProperty("rearLeft")]
        public double RearLeft { get; set; }

        [JsonProperty("rearRight")]
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