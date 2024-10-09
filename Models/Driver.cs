using R3E.Data;

namespace ReHUD.Models;

public static class Driver {
    public static string GetDriverUid(DriverInfo driver) {
        return $"{GetDriverName(driver)}_{driver.userId}_{driver.slotId}_{driver.liveryId}";
    }

    public static string GetDriverName(DriverInfo driver) {
        return System.Text.Encoding.UTF8.GetString(driver.name.TakeWhile(c => c != 0).ToArray());
    }
}