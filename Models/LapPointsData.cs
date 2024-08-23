using Newtonsoft.Json;

namespace ReHUD.Models;

public class LapPointsData : CombinationUserData<LapPointsCombination>
{
    protected override string DataFilePath => "lapPointsData.json";

    // combinations[trackLayoutId][classId];

    protected override LapPointsCombination NewCombinationInstance() {
        return new LapPointsCombination();
    }
}

public class LapPointsCombination
{
    [JsonProperty]
    private double? bestLapTime;
    [JsonProperty]
    private double[]? lapPoints;
    [JsonProperty]
    private double? pointsPerMeter;

    public void Set(double bestLapTime, double[] lapPoints, double pointsPerMeter) {
        if (this.bestLapTime == null || this.bestLapTime > bestLapTime) {
            this.bestLapTime = bestLapTime;
            this.lapPoints = lapPoints;
            this.pointsPerMeter = pointsPerMeter;
            Startup.logger.InfoFormat("New best lap time: {0}", bestLapTime);
        }
    }

    public string Serialize() {
        return JsonConvert.SerializeObject(new {
            bestLapTime,
            lapPoints,
            pointsPerMeter
        });
    }
}
