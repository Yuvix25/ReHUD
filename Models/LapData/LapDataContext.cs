using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ReHUD.Models.LapData {
    public class LapDataContext : DbContext {
        public LapDataContext() { }
        public LapDataContext(DbContextOptions<LapDataContext> options) : base(options) { }

        public DbSet<LapContext> LapContexts { get; set; }
        public DbSet<LapLog> LapLogs { get; set; }
        public DbSet<LapLogWithTelemetry> BestLapLogs { get; set; }
        public DbSet<TireWearLog> TireWearLogs { get; set; }
        public DbSet<FuelUsageLog> FuelUsageLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder) {
            try {
                var lapContext = modelBuilder.Entity<LapContext>();
                lapContext.HasKey(l => new { l.Id });
                lapContext.HasIndex(l => new { l.Timestamp, l.TrackLayoutId, l.CarId, l.ClassPerformanceIndex });
                lapContext.HasOne(l => l.LapLog).WithOne(c => c.Context).HasForeignKey<LapLog>("ContextId").IsRequired(false);
                lapContext.HasOne(l => l.TireWearLog).WithOne(c => c.Context).HasForeignKey<TireWearLog>("ContextId").IsRequired(false);
                lapContext.HasOne(l => l.FuelUsageLog).WithOne(c => c.Context).HasForeignKey<FuelUsageLog>("ContextId").IsRequired(false);

                var lapLog = modelBuilder.Entity<LapLog>();
                lapLog.HasKey(l => new { l.Id });
                lapLog.OwnsOne(l => l.TireWear);

                var bestLapLog = modelBuilder.Entity<LapLogWithTelemetry>();
                bestLapLog.OwnsOne(l => l.LapTelemetry);

                var tireWearLog = modelBuilder.Entity<TireWearLog>();
                tireWearLog.HasKey(l => new { l.Id });
                tireWearLog.OwnsOne(l => l.TireWear);

                var fuelUsageLog = modelBuilder.Entity<FuelUsageLog>();
                fuelUsageLog.HasKey(l => new { l.Id });
            } catch (Exception e) {
                Console.WriteLine(e);
            }

        }
    }
}