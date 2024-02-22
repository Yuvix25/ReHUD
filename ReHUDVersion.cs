using Newtonsoft.Json.Linq;
using ReHUD.Models;

namespace ReHUD;

public class ReHUDVersion : UserData
{
    protected override string? DEFAULT_WHEN_EMPTY => null;
    public static readonly Version DEFAULT_VERSION = Version.Parse("0.0.0");
    protected override string DataFilePath => "ReHUD.version";
    private Version version = DEFAULT_VERSION;

    public override string Serialize()
    {
        return version.ToString();
    }

    protected override void Load(string? data)
    {
        version = TrimVersion(data);
    }

    public async Task Update(string version) {
        var newVersion = TrimVersion(version);
        var compare = this.version.CompareTo(newVersion);
        if (compare == 0) return;
        if (compare > 0) {
            await Startup.ShowMessageBox("Cannot downgrade ReHUD version.\nIf you wish to downgrade, please remove the Documents/ReHUD folder first.\nThis will reset all settings and saved user data, such as fuel consumption, tire wear and laptimes.");
            Startup.QuitApp();
            return;
        }

        OnVersionChanged(this.version, newVersion);

        this.version = newVersion;
        Save();
    }

    private static void OnVersionChanged(Version previousVersion, Version version)
    {
        Startup.logger.Info($"Upgrading ReHUD from v{previousVersion} to v{version}");
        var matchingActions = UpgradeActions.Where(x => x.Item1 > previousVersion && x.Item1 <= version);
        foreach (var versionActions in matchingActions)
        {
            foreach (var action in versionActions.Item2)
            {
                Startup.logger.Info($"Running upgrade action v{versionActions.Item1}: {action.Item1}");
                action.Item2();
            }
        }
    }

    // Version, Array of (Action name, Action)
    private static readonly Tuple<Version, Tuple<string, Action>[]>[] UpgradeActions = new Tuple<Version, Tuple<string, Action>[]>[]
    {
        new(Version.Parse("0.8.0"), new Tuple<string, Action>[] {
            new("Move HUD layout to separate file", () => {
                try {
                    Startup.settings.Load();
                    HudLayout.LoadHudLayouts();
                    var hudLayout = (JObject?) Startup.settings.Data.Remove("hudLayout") ?? (!HudLayout.Layouts.Any() ? new JObject() : null);
                    if (hudLayout != null) {
                        Startup.logger.Info("Found HUD layout in settings, moving to separate file");

                        HudLayout hudLayoutData = HudLayout.AddHudLayout(new(true));
                        
                        foreach (var element in hudLayout) {
                            if (element.Value is JArray elementData) {
                                var id = element.Key;
                                var left = elementData[0]?.Value<double?>() ?? 0;
                                var top = elementData[1]?.Value<double?>() ?? 0;
                                var scale = elementData[2]?.Value<double>() ?? 1;
                                var shown = elementData[3]?.Value<bool>() ?? true;
                                hudLayoutData.AddElement(id, left, top, scale, shown);
                            }
                        }
                        hudLayoutData.Save();

                        Startup.settings.Save();
                    }
                } catch (Exception e) {
                    Startup.logger.Error("Failed to move HUD layout to separate file: " + e);
                }
            }),
        }),
    };

    public static Version TrimVersion(string? version)
    {
        if (version == null) return DEFAULT_VERSION;
        return Version.Parse(version.Split('v')[^1].Split('-')[0]);
    }
}