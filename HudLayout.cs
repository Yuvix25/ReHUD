using System.Reflection;
using ElectronNET.API;
using ElectronNET.API.Entities;
using Newtonsoft.Json;
using ReHUD.Models;

namespace ReHUD;

public class HudLayout : JsonUserData
{
    private static readonly Dictionary<string, HudLayout> layouts = new();
    public static IEnumerable<HudLayout> Layouts => layouts.Values;
    public static HudLayout? ActiveHudLayout { get; private set; }
    public static HudLayout? ReplayHudLayout { get; private set; }
    public static HudLayout? BeforeReplayHudLayout { get; private set; }

    public string Name { get; private set; }

    private bool active = false;

    [JsonProperty("active")]
    public bool Active
    {
        get
        {
            return active;
        }
        set
        {
            if (value && Startup.IsInEditMode) return;
            if (value && !active)
            {
                SetActiveLayout(this, false);
            }
            active = value;
        }
    }

    private bool isReplayLayout = false;
    [JsonProperty("isReplayLayout")]
    public bool IsReplayLayout {
        get {
            return isReplayLayout;
        }
        set {
            if (value && !isReplayLayout)
            {
                SetReplayLayout(this, false);
            }
            isReplayLayout = value;
        }
    }

    [JsonProperty]
    private readonly Dictionary<string, HudElement> elements = new();
    public static readonly string subPath = "LayoutPresets";
    public override string SubPath => subPath;
    protected override string DataFilePath => Name + ".json";

    // <summary>
    // Loads an existing HUD layout
    // </summary>
    public HudLayout(string name)
    {
        Name = name;
        Load();
    }

    // <summary>
    // Creates a new HUD layout with a free name
    // </summary>
    public HudLayout(bool active)
    {
        Name = GetFreeId() ?? throw new InvalidOperationException("Failed to get free HUD layout ID");
        this.active = active;

        Save();
    }

    // <summary>
    // Creates a new HUD layout with a specified name
    // </summary>
    public HudLayout(string name, bool active)
    {
        Name = name;
        this.active = active;

        Save();
    }


    public async Task<bool> Rename(string newName)
    {
        if (newName == Name) return true;
        if (NameTaken(newName))
        {
            await Startup.ShowMessageBox(Startup.SettingsWindow, $"Layout with name {newName} already exists");
            return false;
        }
        var oldPath = PathTo(Name);
        VerifyDirectory();
        if (File.Exists(oldPath))
        {
            File.Move(oldPath, PathTo(newName));
        }
        
        layouts.Remove(Name);
        if (layouts.ContainsKey(newName))
        {
            layouts.Remove(newName);
        }        
        Name = newName;
        layouts.Add(newName, this);

        return true;
    }

    public async Task<bool> DeleteLayout() {
        var resp = await Startup.ShowMessageBox("Are you sure you want to delete '" + Name + "'?", new string[] { "Yes", "No" }, "Delete HUD layout", MessageBoxType.warning);
        if (resp.Response == 0)
        {
            var res = Delete();
            if (!res) return false;

            layouts.Remove(Name);
            
            if (ActiveHudLayout == this)
            {
                if (layouts.Count > 0)
                {
                    SetActiveLayout(layouts.Values.First());
                }
                else
                {
                    ActiveHudLayout = null;
                }
            }

            return true;
        }
        return false;
    }

    protected override void Load(string? data)
    {
        if (data == null) return;
        JsonConvert.PopulateObject(data, this);
    }

    public void Reset()
    {
        elements.Clear();
    }

    public void Cancel() {
        Load();
    }

    public HudElement AddElement(string id, double? left, double? top, double scale, bool shown)
    {
        var element = new HudElement(left, top, scale, shown);
        elements.Add(id, element);
        return element;
    }

    public HudElement? GetElement(string id)
    {
        return elements.ContainsKey(id) ? elements[id] : null;
    }

    public HudElement? RemoveElement(string id)
    {
        if (!elements.ContainsKey(id)) return null;
        var element = elements[id];
        elements.Remove(id);
        return element;
    }

    public void CopyFrom(HudLayout hudLayout)
    {
        if (this == hudLayout) return;
        if (hudLayout.Name != Name)
        {
            Startup.logger.Error($"Attempted to copy HUD layout with different ID: {hudLayout.Name} != {Name}");
            return;
        }
        IsReplayLayout = hudLayout.IsReplayLayout;
        UpdateElements(hudLayout.elements);
    }

    public void UpdateElements(Dictionary<string, HudElement> elements)
    {
        if (this.elements == elements) return;
        this.elements.Clear();
        foreach (var element in elements)
        {
            this.elements.Add(element.Key, element.Value);
        }
    }

    public string SerializeElements()
    {
        return JsonConvert.SerializeObject(elements);
    }


    public static string SerializeLayouts(bool includeName = false)
    {
        if (includeName)
        {
            return JsonConvert.SerializeObject(layouts.Values.Select(layout => new { name = layout.Name, active = layout.Active, isReplayLayout = layout.IsReplayLayout, layout.elements }));
        }
        return JsonConvert.SerializeObject(layouts);
    }

    public static void SaveAll()
    {
        foreach (var hudLayout in layouts.Values)
        {
            hudLayout.Save();
        }
    }

    public static void VerifyDirectory()
    {
        Directory.CreateDirectory(Path.Join(dataPath, subPath));
    }

    public static void LoadHudLayouts()
    {
        VerifyDirectory();
        foreach (var file in Directory.GetFiles(Path.Join(dataPath, subPath), "*.json"))
        {
            AddHudLayout(new HudLayout(Path.GetFileNameWithoutExtension(file)));
        }
        if (ActiveHudLayout == null && layouts.Count > 0)
        {
            SetActiveLayout(layouts.Values.First());
            layouts.Values.First().Save();
        }
    }

    public static bool SetActiveLayout(HudLayout layout, bool setActive = true, bool clearBeforeReplay = true)
    {
        Startup.logger.Info($"Setting active layout to {layout.Name}");
        if (Startup.IsInEditMode) {
            Startup.logger.Info("Not setting active layout because we're in edit mode");
            return false;
        }
        if (ExistsAndIsDifferent(layout) != null)
        {
            Startup.logger.Warn($"Attempted to set active layout to a layout different than the one in the list: {layout.Name}");
            return false;
        }
        ActiveHudLayout = layout;
        if (clearBeforeReplay)
        {
            BeforeReplayHudLayout = null;
        }
        SetSingularBoolForLayout(layout, "active", setActive);
        return true;
    }
    public static void SetReplayLayout(HudLayout layout, bool setReplay = true)
    {
        ReplayHudLayout = layout;
        SetSingularBoolForLayout(layout, "isReplayLayout", setReplay);
    }

    public static void SetSingularBoolForLayout(HudLayout layout, string property, bool setValue = true)
    {
        var prop = typeof(HudLayout).GetField(property, BindingFlags.NonPublic | BindingFlags.Instance);
        if (prop == null) {
            Startup.logger.Error($"Failed to find property '{property}' in HudLayout");
            return;
        }
        if (setValue)
        {
            prop.SetValue(layout, true);
        }
        foreach (var hudLayout in layouts.Values)
        {
            if (hudLayout != layout)
            {
                prop.SetValue(hudLayout, false);
                hudLayout.Save();
            }
        }
    }

    public static HudLayout? LoadReplayLayout()
    {
        if (ReplayHudLayout != null)
        {
            var before = ActiveHudLayout;
            var res = SetActiveLayout(ReplayHudLayout, true, false);
            if (!res) return null;
            BeforeReplayHudLayout = before;
            Startup.logger.Info($"Loaded replay layout: {ReplayHudLayout.Name}");
            return ReplayHudLayout;
        }
        return null;
    }
    public static HudLayout? UnloadReplayLayout()
    {
        if (BeforeReplayHudLayout != null)
        {
            var layout = BeforeReplayHudLayout; // needed because BeforeReplayHudLayout is set to null in SetActiveLayout
            var res = SetActiveLayout(layout);
            if (!res) return null;
            Startup.logger.Info($"Loaded normal layout: {layout.Name}");
            return layout;
        }
        return null;
    }

    private static HudLayout? ExistsAndIsDifferent(HudLayout hudLayout)
    {
        var existing = GetHudLayout(hudLayout.Name);
        if (existing != hudLayout)
        {
            return existing;
        }
        return null;
    }

    public static HudLayout AddHudLayout(HudLayout hudLayout)
    {
        var existing = ExistsAndIsDifferent(hudLayout);
        if (existing != null)
        {
            existing.CopyFrom(hudLayout);
            return existing;
        }

        layouts.Add(hudLayout.Name, hudLayout);
        if (hudLayout.Active || ActiveHudLayout == null)
        {
            var activeBefore = hudLayout.Active;
            if (Startup.IsInEditMode) {
                hudLayout.Active = false;
            } else {
                SetActiveLayout(hudLayout);
            }
            if (hudLayout.Active != activeBefore)
            {
                hudLayout.Save();
            }
        }
        return hudLayout;
    }

    public static HudLayout? GetHudLayout(string name)
    {
        return layouts.ContainsKey(name) ? layouts[name] : null;
    }

    public static HudLayout? UpdateActiveHudLayout(HudLayout newLayout, bool removeBefore = true)
    {
        HudLayout layout = ActiveHudLayout ?? throw new InvalidOperationException("No active HUD layout");
        layout.CopyFrom(newLayout);
        var res = SetActiveLayout(layout, true, removeBefore);

        return res ? layout : ActiveHudLayout;
    }


    private static new string PathTo(string name)
    {
        return Path.Combine(dataPath, subPath, $"{name}.json");
    }

    private static bool NameTaken(string name)
    {
        return layouts.ContainsKey(name) || File.Exists(PathTo(name));
    }

    public static string? GetFreeId()
    {
        for (int i = 1; i < 100; i++)
        {
            var layoutName = $"LayoutPreset{i}";
            if (!NameTaken(layoutName))
            {
                Startup.logger.Info($"Found free name for HUD layout: {layoutName}");
                return layoutName;
            }
        }
        Startup.ShowMessageBox("You have too many HUD layouts. Please remove some of them.").ContinueWith(_ =>
        {
            Startup.QuitApp();
        });

        return null;
    }
}


[JsonObject(MemberSerialization.OptIn)]
public class HudElement
{
    [JsonProperty("left")]
    public double? Left { get; set; }

    [JsonProperty("top")]
    public double? Top { get; set; }

    [JsonProperty("scale")]
    public double Scale { get; set; }

    [JsonProperty("shown")]
    public bool Shown { get; set; }


    public HudElement(double? left, double? top, double scale, bool shown)
    {
        this.Left = left;
        this.Top = top;
        this.Scale = scale;
        this.Shown = shown;
    }
}
