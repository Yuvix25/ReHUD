using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReHUD.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LapContexts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TrackLayoutId = table.Column<int>(type: "INTEGER", nullable: false),
                    CarId = table.Column<int>(type: "INTEGER", nullable: false),
                    ClassPerformanceIndex = table.Column<int>(type: "INTEGER", nullable: false),
                    Valid = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LapContexts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FuelUsageLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FuelUsage = table.Column<double>(type: "REAL", nullable: false),
                    ContextId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FuelUsageLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FuelUsageLogs_LapContexts_ContextId",
                        column: x => x.ContextId,
                        principalTable: "LapContexts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LapLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LapTime = table.Column<double>(type: "REAL", nullable: false),
                    TireWear_FrontLeft = table.Column<double>(type: "REAL", nullable: true),
                    TireWear_FrontRight = table.Column<double>(type: "REAL", nullable: true),
                    TireWear_RearLeft = table.Column<double>(type: "REAL", nullable: true),
                    TireWear_RearRight = table.Column<double>(type: "REAL", nullable: true),
                    FuelUsage = table.Column<double>(type: "REAL", nullable: true),
                    Discriminator = table.Column<string>(type: "TEXT", nullable: false),
                    LapTelemetry_InternalLapPoints = table.Column<string>(type: "TEXT", nullable: true),
                    LapTelemetry_PointsPerMeter = table.Column<double>(type: "REAL", nullable: true),
                    ContextId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LapLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LapLogs_LapContexts_ContextId",
                        column: x => x.ContextId,
                        principalTable: "LapContexts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TireWearLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TireWear_FrontLeft = table.Column<double>(type: "REAL", nullable: false),
                    TireWear_FrontRight = table.Column<double>(type: "REAL", nullable: false),
                    TireWear_RearLeft = table.Column<double>(type: "REAL", nullable: false),
                    TireWear_RearRight = table.Column<double>(type: "REAL", nullable: false),
                    ContextId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TireWearLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TireWearLogs_LapContexts_ContextId",
                        column: x => x.ContextId,
                        principalTable: "LapContexts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_FuelUsageLogs_ContextId",
                table: "FuelUsageLogs",
                column: "ContextId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LapContexts_Timestamp_TrackLayoutId_CarId_ClassPerformanceIndex",
                table: "LapContexts",
                columns: new[] { "Timestamp", "TrackLayoutId", "CarId", "ClassPerformanceIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_LapLogs_ContextId",
                table: "LapLogs",
                column: "ContextId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TireWearLogs_ContextId",
                table: "TireWearLogs",
                column: "ContextId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FuelUsageLogs");

            migrationBuilder.DropTable(
                name: "LapLogs");

            migrationBuilder.DropTable(
                name: "TireWearLogs");

            migrationBuilder.DropTable(
                name: "LapContexts");
        }
    }
}
