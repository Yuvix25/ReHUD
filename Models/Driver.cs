using R3E.Data;
using ReHUD.Utils;

namespace ReHUD.Models;

public class Driver {
    private static readonly Dictionary<string, Driver> drivers = new();

    public string Id { get; }
    public DriverData? OldData { get; private set; } = null;
    public DriverData Data { get; private set; }

    private Driver(DriverData data, string id) {
        Data = data;
        Id = id;
        drivers[id] = this;
    }

    public static Driver GetDriverOrNew(DriverData data) {
        string id = GetDriverUid(data.driverInfo);
        var driver = drivers.GetValueOrDefault(id);
        return driver ?? new Driver(data, id);
    }


    public static string GetDriverUid(DriverInfo driver) {
        return $"{GetDriverName(driver)}_{driver.userId}_{driver.slotId}_{driver.liveryId}";
    }

    public static string GetDriverName(DriverInfo driver) {
        return System.Text.Encoding.UTF8.GetString(driver.name.TakeWhile(c => c != 0).ToArray());
    }
}