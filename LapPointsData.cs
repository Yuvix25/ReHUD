using Newtonsoft.Json;

namespace R3E;

public class LapPointsData : CombinationUserData<LapPointsCombination>
{
    protected override string DataFilePath => "lapPointsData.json";

    // combinations[trackLayoutId][classId];

    protected override LapPointsData NewInstance()
    {
        return new LapPointsData();
    }

    protected override LapPointsCombination NewCombinationInstance()
    {
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

    public void Set(double bestLapTime, double[] lapPoints, double pointsPerMeter)
    {
        if (this.bestLapTime == null || this.bestLapTime > bestLapTime)
        {
            this.bestLapTime = bestLapTime;
            this.lapPoints = lapPoints;
            this.pointsPerMeter = pointsPerMeter;
            ReHUD.Startup.logger.Info($"New best lap time: {bestLapTime}");
        }
    }

    public string Serialize()
    {
        return JsonConvert.SerializeObject(new
        {
            bestLapTime,
            lapPoints,
            pointsPerMeter
        });
    }
}
