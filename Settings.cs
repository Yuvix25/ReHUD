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

    public IEnumerable<KeyValuePair<string, object>> Settings => settings;

    public SettingsData() {
        settings = new();
    }
    public SettingsData(string data)
    {
        settings = JsonConvert.DeserializeObject<Dictionary<string, object>>(data) ?? new();
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
        return Contains(key) ? settings[key] : null;
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
