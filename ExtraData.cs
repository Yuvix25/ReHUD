namespace ReHUD;

internal struct ExtraData {
    public R3E.Data.Shared rawData;

    // difference to RawData.FuelPerLap is that it averages instead of taking the maximum, and is also based on data from previous sessions.
    public double fuelPerLap;
    public double? fuelLastLap;
    public double averageLapTime;
    public double bestLapTime;
    public int estimatedRaceLapCount;
    public double lapsUntilFinish;
    public bool forceUpdateAll;
}
