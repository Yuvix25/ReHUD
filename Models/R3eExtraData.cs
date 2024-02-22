using Newtonsoft.Json.Linq;
using R3E.Data;

namespace ReHUD.Models;

public struct R3eExtraData
{
    public R3eData rawData;

    // difference to RawData.FuelPerLap is that it averages instead of taking the maximum, and is also based on data from previous sessions.
    public double fuelPerLap;
    public double fuelLastLap;
    public double averageLapTime;
    public double bestLapTime;
    public int estimatedRaceLapCount;
    public double lapsUntilFinish;
    public bool forceUpdateAll;

    public double timestamp;


    /// <summary>
    /// Serialize this object to JSON.
    /// </summary>
    /// <param name="filter">If not null, only include these keys in the output. Keys starting with '+' are keys from ExtraData, other keys are from the rawData field.</param>
    public readonly string Serialize(string[]? filter = null) {
        var obj = JObject.FromObject(this);

        if (filter != null) {
            var newObj = new JObject {
                ["rawData"] = new JObject()
            };
            foreach (var key in filter) {
                try {
                    if (key.StartsWith('+')) {
                        newObj[key[1..]] = obj[key[1..]];
                    }
                    else {
                        newObj["rawData"]![key] = obj["rawData"]![key];
                    }
                }
                catch (Exception e) {
                    Startup.logger.Error($"Failed to serialize shared memory key '{key}': {e}");
                    throw;
                }
            }
            obj = newObj;
        }
        return obj.ToString();
    }
}
