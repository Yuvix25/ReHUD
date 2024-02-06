using System.Collections.Immutable;
using Newtonsoft.Json;

namespace ReHUD;

public class Settings : JsonUserData
{
    protected override string DataFilePath => "settings.json";

    protected SettingsData settings = new();

    public SettingsData Data => settings;

    protected override void Load(string? data)
    {
        if (data == null)
        {
            settings = new SettingsData();
            return;
        }
        settings = new SettingsData(data);
    }

    public override string Serialize()
    {
        return settings.Serialize();
    }
}

[JsonObject(MemberSerialization.OptIn)]
public class SettingsData
{
    [JsonProperty]
    private readonly Dictionary<string, object> settings;

    public readonly ImmutableDictionary<string, object> DefaultSettings = ImmutableDictionary<string, object>.Empty
        .Add("framerate", 60)
        .Add("speedUnits", "kmh")
        .Add("radarRange", 12)
        .Add("radarBeepVolume", 1)
        .Add("positionBarCellCount", 13)
        .Add("deltaMode", "session")
        .Add("showDeltaOnInvalidLaps", false)
        .Add("relativeSafeMode", false)
        .Add("check-for-updates", true)
        .Add("hardwareAcceleration", true);

    public IEnumerable<KeyValuePair<string, object>> Settings => settings;

    public SettingsData() {
        settings = new();
    }
    public SettingsData(string data)
    {
        settings = JsonConvert.DeserializeObject<Dictionary<string, object>>(data) ?? new();
        foreach (var (key, value) in DefaultSettings)
        {
            if (!settings.ContainsKey(key))
            {
                settings[key] = value;
            }
        }
    }

    public string Serialize()
    {
        return JsonConvert.SerializeObject(settings);
    }

    public void Set(string? key, object value)
    {
        if (key == null)
        {
            Startup.logger.Error("Attempted to set null key in settings. Value: " + value.ToString());
            return;
        }

        settings[key] = value;
    }

    public object? Get(string key)
    {
        return Contains(key) ? settings[key] : (DefaultSettings.ContainsKey(key) ? DefaultSettings[key] : null);
    }

    public object? Get(string key, object? orDefault)
    {
        return Contains(key) ? settings[key] : orDefault;
    }

    public object? Remove(string key)
    {
        var value = Get(key);
        settings.Remove(key);
        return value;
    }

    public bool Contains(string key)
    {
        return settings.ContainsKey(key);
    }
}


[JsonObject(MemberSerialization.OptOut)]
public class HudLayoutSettingsEntry
{
    public readonly string id;
    public bool active { get; set; }

    public HudLayoutSettingsEntry(string id, bool active)
    {
        this.id = id;
        this.active = active;
    }
}
