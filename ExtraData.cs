namespace R3E_Electron_Overlay;

internal struct ExtraData {
    public R3E.Data.Shared RawData;

    // difference to RawData.FuelPerLap is that it averages instead of taking the maximum, and is also based on data from previous sessions.
    public double FuelPerLap;
    public double AverageLapTime;
    public double BestLapTime;
}