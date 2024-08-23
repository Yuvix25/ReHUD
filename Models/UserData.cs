using Newtonsoft.Json;

namespace ReHUD.Models;

public abstract class UserData
{
    public static readonly string dataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "ReHUD");

    public virtual string SubPath { get; } = "";
    protected abstract string DataFilePath { get; }
    protected virtual string? DEFAULT_WHEN_EMPTY => "";

    public abstract string Serialize();

    public bool DidLoad { get; private set; } = false;

    public void Load() {
        DidLoad = true;
        Load(ReadDataFile(DataFilePath));
    }

    protected abstract void Load(string? data);

    public virtual void Save() {
        WriteDataFile(DataFilePath, Serialize());
    }

    public virtual bool Delete() {
        try {
            File.Delete(PathTo(DataFilePath));
            return true;
        }
        catch (Exception e) {
            Startup.logger.Error($"Failed to delete file {DataFilePath}", e);
            return false;
        }
    }

    public string PathTo(string name) {
        return Path.Combine(dataPath, SubPath, name);
    }

    private string? ReadDataFile(string name) {
        try {
            var path = PathTo(name);
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            return File.ReadAllText(path);
        }
        catch {
            return DEFAULT_WHEN_EMPTY;
        }
    }

    private void WriteDataFile(string name, string data) {
        File.WriteAllText(PathTo(name), data);
    }
}

[JsonObject(MemberSerialization.OptIn)]
public abstract class JsonUserData : UserData
{
    protected override string DEFAULT_WHEN_EMPTY => "{}";
    public override string Serialize() {
        return JsonConvert.SerializeObject(this);
    }
}


[JsonObject(MemberSerialization.OptIn)]
public abstract class CombinationUserData<C> : JsonUserData
{
    protected abstract C NewCombinationInstance();

    [JsonProperty]
    protected Dictionary<int, Dictionary<int, C>> combinations;

    protected CombinationUserData() : this(new Dictionary<int, Dictionary<int, C>>()) { }
    protected CombinationUserData(Dictionary<int, Dictionary<int, C>> combinations) {
        this.combinations = combinations;
    }

    public C? GetCombination(int id1, int id2, bool createIfMissing) {
        if (!combinations.ContainsKey(id1)) {
            if (!createIfMissing) {
                return default;
            }
            combinations.Add(id1, new Dictionary<int, C>());
        }

        Dictionary<int, C> layoutCombos = combinations[id1];
        if (!layoutCombos.ContainsKey(id2)) {
            if (!createIfMissing) {
                return default;
            }
            layoutCombos.Add(id2, NewCombinationInstance());
        }

        return layoutCombos[id2];
    }

    public C GetCombination(int id1, int id2) {
        return GetCombination(id1, id2, true)!;
    }

    public C SetCombination(int id1, int id2, C combination) {
        if (!combinations.ContainsKey(id1)) {
            combinations.Add(id1, new Dictionary<int, C>());
        }

        Dictionary<int, C> layoutCombos = combinations[id1];
        if (!layoutCombos.ContainsKey(id2)) {
            layoutCombos.Add(id2, combination);
        }
        else {
            layoutCombos[id2] = combination;
        }

        return combination;
    }

    protected override void Load(string? data) {
        if (data == null) {
            combinations = new Dictionary<int, Dictionary<int, C>>();
            return;
        }
        var method = typeof(JsonConvert).GetMethod("DeserializeObject", 1, new Type[] { typeof(string) })!;
        var genericMethod = method.MakeGenericMethod(GetType());

        CombinationUserData<C>? loadedData = (CombinationUserData<C>?)genericMethod.Invoke(null, new object[] { data });
        if (loadedData == null)
            combinations = new Dictionary<int, Dictionary<int, C>>();
        else
            combinations = loadedData.combinations;
    }

    public void Clear() {
        combinations.Clear();
    }
}
