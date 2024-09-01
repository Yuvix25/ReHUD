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
                name: "BestLaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DataId = table.Column<int>(type: "INTEGER", nullable: true),
                    PendingRemoval = table.Column<bool>(type: "INTEGER", nullable: false),
                    Value_PointsPerMeter = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BestLaps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FuelUsages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DataId = table.Column<int>(type: "INTEGER", nullable: true),
                    PendingRemoval = table.Column<bool>(type: "INTEGER", nullable: false),
                    Value = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FuelUsages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LapsContext",
                columns: table => new
                {
                    TrackLayoutId = table.Column<int>(type: "INTEGER", nullable: false),
                    CarId = table.Column<int>(type: "INTEGER", nullable: false),
                    ClassPerformanceIndex = table.Column<int>(type: "INTEGER", nullable: false),
                    BestLapId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LapsContext", x => new { x.TrackLayoutId, x.CarId, x.ClassPerformanceIndex });
                });

            migrationBuilder.CreateTable(
                name: "LapsData",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Valid = table.Column<bool>(type: "INTEGER", nullable: false),
                    TrackLayoutId = table.Column<int>(type: "INTEGER", nullable: false),
                    CarId = table.Column<int>(type: "INTEGER", nullable: false),
                    ClassPerformanceIndex = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LapsData", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LapsData_LapsContext_TrackLayoutId_CarId_ClassPerformanceIndex",
                        columns: x => new { x.TrackLayoutId, x.CarId, x.ClassPerformanceIndex },
                        principalTable: "LapsContext",
                        principalColumns: new[] { "TrackLayoutId", "CarId", "ClassPerformanceIndex" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LapTimes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DataId = table.Column<int>(type: "INTEGER", nullable: false),
                    PendingRemoval = table.Column<bool>(type: "INTEGER", nullable: false),
                    Value = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LapTimes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LapTimes_LapsData_DataId",
                        column: x => x.DataId,
                        principalTable: "LapsData",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TireWears",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DataId = table.Column<int>(type: "INTEGER", nullable: true),
                    PendingRemoval = table.Column<bool>(type: "INTEGER", nullable: false),
                    Value_FrontLeft = table.Column<double>(type: "REAL", nullable: false),
                    Value_FrontRight = table.Column<double>(type: "REAL", nullable: false),
                    Value_RearLeft = table.Column<double>(type: "REAL", nullable: false),
                    Value_RearRight = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TireWears", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TireWears_LapsData_DataId",
                        column: x => x.DataId,
                        principalTable: "LapsData",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_BestLaps_DataId",
                table: "BestLaps",
                column: "DataId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FuelUsages_DataId",
                table: "FuelUsages",
                column: "DataId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LapsContext_BestLapId",
                table: "LapsContext",
                column: "BestLapId");

            migrationBuilder.CreateIndex(
                name: "IX_LapsContext_TrackLayoutId_CarId_ClassPerformanceIndex",
                table: "LapsContext",
                columns: new[] { "TrackLayoutId", "CarId", "ClassPerformanceIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_LapsData_TrackLayoutId_CarId_ClassPerformanceIndex",
                table: "LapsData",
                columns: new[] { "TrackLayoutId", "CarId", "ClassPerformanceIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_LapTimes_DataId",
                table: "LapTimes",
                column: "DataId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TireWears_DataId",
                table: "TireWears",
                column: "DataId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_BestLaps_LapsData_DataId",
                table: "BestLaps",
                column: "DataId",
                principalTable: "LapsData",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_FuelUsages_LapsData_DataId",
                table: "FuelUsages",
                column: "DataId",
                principalTable: "LapsData",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_LapsContext_LapsData_BestLapId",
                table: "LapsContext",
                column: "BestLapId",
                principalTable: "LapsData",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LapsContext_LapsData_BestLapId",
                table: "LapsContext");

            migrationBuilder.DropTable(
                name: "BestLaps");

            migrationBuilder.DropTable(
                name: "FuelUsages");

            migrationBuilder.DropTable(
                name: "LapTimes");

            migrationBuilder.DropTable(
                name: "TireWears");

            migrationBuilder.DropTable(
                name: "LapsData");

            migrationBuilder.DropTable(
                name: "LapsContext");
        }
    }
}
