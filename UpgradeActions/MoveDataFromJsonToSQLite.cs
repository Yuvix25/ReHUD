using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ReHUD.Interfaces;
using ReHUD.Models.LapData;

namespace ReHUD.UpgradeActions;

public class MoveDataFromJsonToSQLite : UpgradeAction
{
    public override string Description => "Move data from JSON to SQLite (remove old JSON files)";
    public MoveDataFromJsonToSQLite(Version fromVersion) : base(fromVersion, Version.Parse("0.10.0")) { }

    private static void DeleteFile(string name) {
        try {
            File.Delete(Path.Combine(IUserData.dataPath, name));
        } catch (DirectoryNotFoundException) {
        } catch (Exception e) {
            Startup.logger.Error($"Failed to delete {name} during upgrade", e);
        }
    }

    public override void Upgrade()
    {
        DeleteFile("lapPointsData.json");
        DeleteFile("userData.json");
    }
}