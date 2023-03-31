namespace R3E;

class UserData
{
    // combinations[trackLayoutId][carId];
    public Dictionary<int, Dictionary<int, Combination>> combinations;

    public UserData()
    {
        combinations = new Dictionary<int, Dictionary<int, Combination>>();
    }
    public UserData(Dictionary<int, Dictionary<int, Combination>> combinations)
    {
        this.combinations = combinations;
    }

    public Combination GetCombination(int trackLayoutId, int carId)
    {
        if (!combinations.ContainsKey(trackLayoutId))
        {
            combinations.Add(trackLayoutId, new Dictionary<int, Combination>());
        }

        Dictionary<int, Combination> layoutCombos = combinations[trackLayoutId];
        if (!layoutCombos.ContainsKey(carId))
        {
            layoutCombos.Add(carId, new Combination());
        }

        return layoutCombos[carId];
    }
}

class Combination
{
    private const int MAX_DATA_SIZE = 20;
    // public because it needs to be serialized
    public LinkedList<double> fuelUsage = new LinkedList<double>();
    public LinkedList<double> lapTimes = new LinkedList<double>();
    public double bestLapTime = -1;
    private double averageFuelUsage = -1;
    private double averageLapTime = -1;
    private double lastFuel = -1;

    public void AddFuelUsage(double fuelUsage, bool valid)
    {
        if (fuelUsage <= 0)
            return;

        lastFuel = fuelUsage;

        if (valid)
        {
            averageFuelUsage = -1;
            this.fuelUsage.AddLast(fuelUsage);
            if (this.fuelUsage.Count > MAX_DATA_SIZE)
            {
                this.fuelUsage.RemoveFirst();
            }
        }
    }
    public void AddFuelUsage(double fuelUsage)
    {
        AddFuelUsage(fuelUsage, true);
    }

    public void AddLapTime(double lapTime)
    {
        if (lapTime <= 0)
            return;

        averageLapTime = -1;
        this.lapTimes.AddLast(lapTime);
        if (this.lapTimes.Count > MAX_DATA_SIZE)
        {
            this.lapTimes.RemoveFirst();
        }

        if (bestLapTime == -1 || lapTime < bestLapTime)
        {
            bestLapTime = lapTime;
        }
    }

    public double GetAverageFuelUsage()
    {
        if (averageFuelUsage != -1)
            return averageFuelUsage;

        if (fuelUsage.Count == 0)
            return 0;

        double sum = 0;
        foreach (double fuel in fuelUsage)
        {
            sum += fuel;
        }
        averageFuelUsage = sum / fuelUsage.Count;
        return averageFuelUsage;
    }

    public double? GetLastLapFuelUsage()
    {
        if (lastFuel != -1 && fuelUsage.Count > 0)
            return lastFuel;

        return null;
    }

    public double GetAverageLapTime()
    {
        if (averageLapTime != -1)
            return averageLapTime;

        if (lapTimes.Count == 0)
            return 0;

        double sum = 0;
        foreach (double lapTime in lapTimes)
        {
            sum += lapTime;
        }
        averageLapTime = sum / lapTimes.Count;
        return averageLapTime;
    }

    public double GetBestLapTime()
    {
        return bestLapTime;
    }
}

