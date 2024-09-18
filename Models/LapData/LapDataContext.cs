using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ReHUD.Models.LapData {
    public class LapDataContext : DbContext {
        public LapDataContext() { }
        public LapDataContext(DbContextOptions<LapDataContext> options) : base(options) { }

        public DbSet<Context> Contexts { get; set; }
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
            c.TireCompoundFront,
        };
        private static readonly Expression<Func<TireWearContext, object?>> TIRE_WEAR_CONTEXT_KEYS = (c) => new {
            c.TireWearRate,
        };
        private static readonly Expression<Func<FuelUsageContext, object?>> FUEL_USAGE_CONTEXT_KEYS = (c) => new {
            c.FuelUsageRate,
        };


        private static EntityTypeBuilder<C> ConfigureContext<C>(ModelBuilder modelBuilder, Expression<Func<C, object?>> keys) where C : Context {
            var context = modelBuilder.Entity<C>();
            context.HasAlternateKey(keys);
            context.HasIndex(keys);

            return context;
        }

        private static EntityTypeBuilder<LapContext> ConfigureLapContext(ModelBuilder modelBuilder, Expression<Func<LapContext, object?>> keys, string foreignKey) {
            var context = ConfigureContext(modelBuilder, keys);
            context.HasMany(c => c.Entries).WithOne(l => l.Context).HasForeignKey(foreignKey).IsRequired();
            return context;
        }

        private static EntityTypeBuilder<C> ConfigureContext<C, T, V>(ModelBuilder modelBuilder, Expression<Func<C, object?>> keys, string foreignKey) where C : Context<T> where T : LapPointer<C, T, V>, IEntityWithContext<Context<T>> {
            var context = ConfigureContext(modelBuilder, keys);
            context.HasMany(c => c.Entries).WithOne(e => e.TypedContext).HasForeignKey(foreignKey).IsRequired();
            return context;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder) {
            try {
                ConfigureLapContext(modelBuilder, LAP_CONTEXT_KEYS, LAP_CONTEXT_FK);
                ConfigureContext<TireWearContext, TireWear, TireWearObj>(modelBuilder, TIRE_WEAR_CONTEXT_KEYS, TIRE_WEAR_CONTEXT_FK);
                ConfigureContext<FuelUsageContext, FuelUsage, double>(modelBuilder, FUEL_USAGE_CONTEXT_KEYS, FUEL_USAGE_CONTEXT_FK);


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