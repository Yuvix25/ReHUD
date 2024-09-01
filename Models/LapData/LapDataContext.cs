using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ReHUD.Models.LapData {
    public class LapDataContext : DbContext {
        public LapDataContext() { }
        public LapDataContext(DbContextOptions<LapDataContext> options) : base(options) { }

        public DbSet<LapContext> LapsContext { get; set; }
        public DbSet<LapData> LapsData { get; set; }
        public DbSet<LapTime> LapTimes { get; set; }
        public DbSet<TireWear> TireWears { get; set; }
        public DbSet<FuelUsage> FuelUsages { get; set; }
        public DbSet<Telemetry> BestLaps { get; set; }

        private static readonly string DATA_FK = "DataId";
        private static readonly string[] CONTEXT_FK = new string[] { "TrackLayoutId", "CarId", "ClassPerformanceIndex" };

        private static void ConfigureEntityWithContext<T>(CollectionNavigationBuilder<LapContext, T> builder) where T : class, IEntityWithContext {
            builder.WithOne(e => e.Context).HasForeignKey(CONTEXT_FK).IsRequired();
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder) {
            try {
                var lapContext = modelBuilder.Entity<LapContext>();
                lapContext.HasKey(l => new { l.TrackLayoutId, l.CarId, l.ClassPerformanceIndex });
                lapContext.HasIndex(l => new { l.TrackLayoutId, l.CarId, l.ClassPerformanceIndex });
                ConfigureEntityWithContext(lapContext.HasMany(l => l.Laps));
                lapContext.HasOne(l => l.BestLap);

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