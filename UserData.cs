namespace R3E;

class UserData {
    // combinations[trackLayoutId][carId];
    public Dictionary<int, Dictionary<int, Combination>> combinations;

    public UserData() {
        combinations = new Dictionary<int, Dictionary<int, Combination>>();
    }
    public UserData(Dictionary<int, Dictionary<int, Combination>> combinations) {
        this.combinations = combinations;
    }

    public Combination GetCombination(int trackLayoutId, int carId) {
        if (!combinations.ContainsKey(trackLayoutId)) {
            combinations.Add(trackLayoutId, new Dictionary<int, Combination>());
        }

        Dictionary<int, Combination> layoutCombos = combinations[trackLayoutId];
        if (!layoutCombos.ContainsKey(carId)) {
            layoutCombos.Add(carId, new Combination());
        }

        return layoutCombos[carId];
    }
}

class Combination {
    private const int MAX_DATA_SIZE = 20;
    // public because it needs to be serialized
    public LinkedList<double> fuelUsage = new LinkedList<double>();
    public LinkedList<double> lapTimes = new LinkedList<double>();
    private double bestLapTime = -1;

    public void AddFuelUsage(double fuelUsage) {
        if (fuelUsage <= 0)
            return;

        Console.WriteLine("Fuel usage: " + fuelUsage);
        this.fuelUsage.AddLast(fuelUsage);
        if (this.fuelUsage.Count > MAX_DATA_SIZE) {
            this.fuelUsage.RemoveFirst();
        }
    }

    public void AddLapTime(double lapTime) {
        if (lapTime <= 0)
            return;

        Console.WriteLine("Lap time: " + lapTime);
        this.lapTimes.AddLast(lapTime);
        if (this.lapTimes.Count > MAX_DATA_SIZE) {
            this.lapTimes.RemoveFirst();
        }

        if (bestLapTime == -1 || lapTime < bestLapTime) {
            bestLapTime = lapTime;
        }
    }

    public double GetAverageFuelUsage() {
        if (fuelUsage.Count == 0) {
            return 0;
        }

        double sum = 0;
        foreach (double fuel in fuelUsage) {
            sum += fuel;
        }
        return sum / fuelUsage.Count;
    }

    public double GetAverageLapTime() {
        if (lapTimes.Count == 0) {
            return 0;
        }

        double sum = 0;
        foreach (double lapTime in lapTimes) {
            sum += lapTime;
        }
        return sum / lapTimes.Count;
    }

    public double GetBestLapTime() {
        return bestLapTime;
    }
}

