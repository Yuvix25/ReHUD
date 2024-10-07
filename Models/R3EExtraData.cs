using Newtonsoft.Json.Linq;
using R3E.Data;
using ReHUD.Interfaces;
using ReHUD.Models.LapData;

namespace ReHUD.Models;

public struct R3EExtraData
{
    public R3EData rawData;

    public int? lapId;
    // difference to RawData.FuelPerLap is that it averages instead of taking the maximum, and is also based on data from previous sessions.
    public double? fuelPerLap;
    public double? fuelLastLap;
    public TireWearObj? tireWearPerLap;
    public TireWearObj? tireWearLastLap;
    public double? averageLapTime;
    public double? bestLapTime;
    public int? estimatedRaceLapCount;
    public double? lapsUntilFinish;
    public bool forceUpdateAll;

    public double timestamp;

    public ICollection<EventLog> events;


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
                    Startup.logger.Error($"Failed to serialize shared memory key '{key}'", e);
                    throw;
                }
            }
            obj = newObj;
        }
        return obj.ToString();
    }
}
