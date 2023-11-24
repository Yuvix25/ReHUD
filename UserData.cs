using Newtonsoft.Json;

namespace R3E;

[JsonObject(MemberSerialization.OptIn)]
public abstract class UserData
{
    public static readonly string dataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "ReHUD");

    protected abstract string DataFilePath { get; }

    protected abstract UserData NewInstance();


    public virtual string Serialize()
    {
        return JsonConvert.SerializeObject(this);
    }


    public void Load()
    {
        Load(ReadDataFile(DataFilePath));
    }

    protected abstract void Load(string data);

    public void Save()
    {
        WriteDataFile(DataFilePath, Serialize());
    }

    private static string ReadDataFile(string name)
    {
        try
        {
            if (!Directory.Exists(dataPath))
            {
                Directory.CreateDirectory(dataPath);
            }
            return File.ReadAllText(Path.Combine(dataPath, name));
        }
        catch
        {
            return "{}";
        }
    }

    private static void WriteDataFile(string name, string data)
    {
        File.WriteAllText(Path.Combine(dataPath, name), data);
    }
}


[JsonObject(MemberSerialization.OptIn)]
public abstract class CombinationUserData<C> : UserData
{
    protected abstract C NewCombinationInstance();

    [JsonProperty]
    protected Dictionary<int, Dictionary<int, C>> combinations;

    public CombinationUserData() : this(new Dictionary<int, Dictionary<int, C>>()){  }
    public CombinationUserData(Dictionary<int, Dictionary<int, C>> combinations)
    {
        this.combinations = combinations;
    }

    public C? GetCombination(int id1, int id2, bool createIfMissing)
    {
        if (!combinations.ContainsKey(id1))
        {
            if (!createIfMissing)
            {
                return default;
            }
            combinations.Add(id1, new Dictionary<int, C>());
        }

        Dictionary<int, C> layoutCombos = combinations[id1];
        if (!layoutCombos.ContainsKey(id2))
        {
            if (!createIfMissing)
            {
                return default;
            }
            layoutCombos.Add(id2, NewCombinationInstance());
        }

        return layoutCombos[id2];
    }

    public C GetCombination(int id1, int id2)
    {
        return GetCombination(id1, id2, true)!;
    }

    public C SetCombination(int id1, int id2, C combination)
    {
        if (!combinations.ContainsKey(id1))
        {
            combinations.Add(id1, new Dictionary<int, C>());
        }

        Dictionary<int, C> layoutCombos = combinations[id1];
        if (!layoutCombos.ContainsKey(id2))
        {
            layoutCombos.Add(id2, combination);
        }
        else
        {
            layoutCombos[id2] = combination;
        }

        return combination;
    }

    protected override void Load(string data)
    {
        var method = typeof(JsonConvert).GetMethod("DeserializeObject", 1, new Type[] { typeof(string) })!;
        var genericMethod = method.MakeGenericMethod(GetType());

        CombinationUserData<C>? loadedData = (CombinationUserData<C>?)genericMethod.Invoke(null, new object[] { data });
        if (loadedData == null)
            combinations = new Dictionary<int, Dictionary<int, C>>();
        else
            combinations = loadedData.combinations;
    }

    public void Clear()
    {
        combinations.Clear();
    }
}
