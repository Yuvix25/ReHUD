using Newtonsoft.Json;
using R3E;
using ReHUD;

public class Settings : UserData
{
    protected override string DataFilePath => "settings.json";

    protected Dictionary<string, object> settings = new();

    public Settings()
    {
        Load();
    }

    protected override void Load(string data)
    {
        settings = JsonConvert.DeserializeObject<Dictionary<string, object>>(data) ?? new();
    }

    protected override UserData NewInstance()
    {
        return new Settings();
    }

    public void Set(string? key, object value)
    {
        if (key == null)
        {
            Startup.logger.Warn("Attempted to set null key in settings. Value: " + value.ToString());
            return;
        }

        settings[key] = value;
        Save();
    }

    public object? Get(string key)
    {
        return settings.ContainsKey(key) ? settings[key] : null;
    }

    public object Get(string key, object orDefault)
    {
        return settings.ContainsKey(key) ? settings[key] : orDefault;
    }

    public bool Contains(string key)
    {
        return settings.ContainsKey(key);
    }

    public override string Serialize()
    {
        return JsonConvert.SerializeObject(settings);
    }
}