using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ReHUD.Models.LapData {
    public class LapDataContext : DbContext {
        public LapDataContext() { }
        public LapDataContext(DbContextOptions<LapDataContext> options) : base(options) { }

        public DbSet<LapContext> LapContexts { get; set; }
        public DbSet<LapData> LapDatas { get; set; }
        public DbSet<LapTime> LapTimes { get; set; }
        public DbSet<TireWearContext> TireWearContexts { get; set; }
        public DbSet<TireWear> TireWears { get; set; }
        public DbSet<FuelUsageContext> FuelUsageContexts { get; set; }
        public DbSet<FuelUsage> FuelUsages { get; set; }
        public DbSet<Telemetry> BestLaps { get; set; }

        private static readonly string DATA_FK = "DataId";
        private static readonly string LAP_CONTEXT_FK = "LapContextId";
        private static readonly string TIRE_WEAR_CONTEXT_FK = "TireWearContextId";
        private static readonly string FUEL_USAGE_CONTEXT_FK = "FuelUsageContextId";

        private static readonly Expression<Func<LapContext, object?>> LAP_CONTEXT_KEYS = (c) => new {
            c.TrackLayoutId,
            c.CarId,
            c.ClassPerformanceIndex,
            c.TireCompound,
        };
        private static readonly Expression<Func<TireWearContext, object?>> TIRE_WEAR_CONTEXT_KEYS = (c) => new {
            c.TireWearRate,
        };
        private static readonly Expression<Func<FuelUsageContext, object?>> FUEL_USAGE_CONTEXT_KEYS = (c) => new {
            c.FuelUsageRate,
        };


        private static EntityTypeBuilder<T> ConfigureContext<C, T>(ModelBuilder modelBuilder, Expression<Func<C, object?>> keys, string foreignKey) where C : Context<T> where T : class, IEntityWithContext<C>, IEntityWithContext<Context<T>?> {
            var context = modelBuilder.Entity<C>();
            context.HasAlternateKey(keys);
            context.HasIndex(keys);
            context.HasMany(l => l.Entries).WithOne(e => e.Context).HasForeignKey(foreignKey).IsRequired();

            return context;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder) {
            try {
                ConfigureContext<LapContext, LapData>(modelBuilder, LAP_CONTEXT_KEYS, LAP_CONTEXT_FK).HasOne(l => l.BestLap);
                ConfigureContext<TireWearContext, TireWear>(modelBuilder, TIRE_WEAR_CONTEXT_KEYS, TIRE_WEAR_CONTEXT_FK);


                var tireWearContext = modelBuilder.Entity<TireWearContext>();
                tireWearContext.HasAlternateKey(TIRE_WEAR_CONTEXT_KEYS);
                tireWearContext.HasIndex(TIRE_WEAR_CONTEXT_KEYS);
                tireWearContext.HasMany(l => l.Entries).WithOne(e => e.TireWearContext).HasForeignKey(TIRE_WEAR_CONTEXT_FK).IsRequired();

                var lapData = modelBuilder.Entity<LapData>();
                lapData.HasOne(l => l.LapTime).WithOne(c => c.Lap).HasForeignKey<LapTime>(DATA_FK).IsRequired();
                lapData.HasOne(l => l.TireWear).WithOne(c => c.Lap).HasForeignKey<TireWear>(DATA_FK).IsRequired(false);
                lapData.HasOne(l => l.FuelUsage).WithOne(c => c.Lap).HasForeignKey<FuelUsage>(DATA_FK).IsRequired(false);
                lapData.HasOne(l => l.Telemetry).WithOne(c => c.Lap).HasForeignKey<Telemetry>(DATA_FK).IsRequired(false);

                var tireWear = modelBuilder.Entity<TireWear>();
                tireWear.OwnsOne(t => t.Value);

                var telemetry = modelBuilder.Entity<Telemetry>();
                telemetry.OwnsOne(t => t.Value);
            } catch (Exception e) {
                Console.WriteLine(e);
            }

        }
    }
}