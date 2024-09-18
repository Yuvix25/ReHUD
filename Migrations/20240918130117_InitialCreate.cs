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
                name: "FuelUsageContexts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FuelUsageRate = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FuelUsageContexts", x => x.Id);
                    table.UniqueConstraint("AK_FuelUsageContexts_FuelUsageRate", x => x.FuelUsageRate);
                });

            migrationBuilder.CreateTable(
                name: "LapContexts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TrackLayoutId = table.Column<int>(type: "INTEGER", nullable: false),
                    CarId = table.Column<int>(type: "INTEGER", nullable: false),
                    ClassPerformanceIndex = table.Column<int>(type: "INTEGER", nullable: false),
                    TireCompound = table.Column<int>(type: "INTEGER", nullable: false),
                    BestLapId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LapContexts", x => x.Id);
                    table.UniqueConstraint("AK_LapContexts_TrackLayoutId_CarId_ClassPerformanceIndex_TireCompound", x => new { x.TrackLayoutId, x.CarId, x.ClassPerformanceIndex, x.TireCompound });
                });

            migrationBuilder.CreateTable(
                name: "TireWearContexts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TireWearRate = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TireWearContexts", x => x.Id);
                    table.UniqueConstraint("AK_TireWearContexts_TireWearRate", x => x.TireWearRate);
                });

            migrationBuilder.CreateTable(
                name: "LapDatas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Valid = table.Column<bool>(type: "INTEGER", nullable: false),
                    LapContextId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LapDatas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LapDatas_LapContexts_LapContextId",
                        column: x => x.LapContextId,
                        principalTable: "LapContexts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BestLaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DataId = table.Column<int>(type: "INTEGER", nullable: true),
                    PendingRemoval = table.Column<bool>(type: "INTEGER", nullable: false),
                    Value_InternalPoints = table.Column<string>(type: "TEXT", nullable: false),
                    Value_PointsPerMeter = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BestLaps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BestLaps_LapDatas_DataId",
                        column: x => x.DataId,
                        principalTable: "LapDatas",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FuelUsages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DataId = table.Column<int>(type: "INTEGER", nullable: true),
                    PendingRemoval = table.Column<bool>(type: "INTEGER", nullable: false),
                    Value = table.Column<double>(type: "REAL", nullable: false),
                    FuelUsageContextId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FuelUsages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FuelUsages_FuelUsageContexts_FuelUsageContextId",
                        column: x => x.FuelUsageContextId,
                        principalTable: "FuelUsageContexts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FuelUsages_LapDatas_DataId",
                        column: x => x.DataId,
                        principalTable: "LapDatas",
                        principalColumn: "Id");
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
                        name: "FK_LapTimes_LapDatas_DataId",
                        column: x => x.DataId,
                        principalTable: "LapDatas",
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
                    Value_RearRight = table.Column<double>(type: "REAL", nullable: false),
                    TireWearContextId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TireWears", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TireWears_LapDatas_DataId",
                        column: x => x.DataId,
                        principalTable: "LapDatas",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TireWears_TireWearContexts_TireWearContextId",
                        column: x => x.TireWearContextId,
                        principalTable: "TireWearContexts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BestLaps_DataId",
                table: "BestLaps",
                column: "DataId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FuelUsageContexts_FuelUsageRate",
                table: "FuelUsageContexts",
                column: "FuelUsageRate");

            migrationBuilder.CreateIndex(
                name: "IX_FuelUsages_DataId",
                table: "FuelUsages",
                column: "DataId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FuelUsages_FuelUsageContextId",
                table: "FuelUsages",
                column: "FuelUsageContextId");

            migrationBuilder.CreateIndex(
                name: "IX_LapContexts_TrackLayoutId_CarId_ClassPerformanceIndex_TireCompound",
                table: "LapContexts",
                columns: new[] { "TrackLayoutId", "CarId", "ClassPerformanceIndex", "TireCompound" });

            migrationBuilder.CreateIndex(
                name: "IX_LapDatas_LapContextId",
                table: "LapDatas",
                column: "LapContextId");

            migrationBuilder.CreateIndex(
                name: "IX_LapTimes_DataId",
                table: "LapTimes",
                column: "DataId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TireWearContexts_TireWearRate",
                table: "TireWearContexts",
                column: "TireWearRate");

            migrationBuilder.CreateIndex(
                name: "IX_TireWears_DataId",
                table: "TireWears",
                column: "DataId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TireWears_TireWearContextId",
                table: "TireWears",
                column: "TireWearContextId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BestLaps");

            migrationBuilder.DropTable(
                name: "FuelUsages");

            migrationBuilder.DropTable(
                name: "LapTimes");

            migrationBuilder.DropTable(
                name: "TireWears");

            migrationBuilder.DropTable(
                name: "FuelUsageContexts");

            migrationBuilder.DropTable(
                name: "LapDatas");

            migrationBuilder.DropTable(
                name: "TireWearContexts");

            migrationBuilder.DropTable(
                name: "LapContexts");
        }
    }
}
