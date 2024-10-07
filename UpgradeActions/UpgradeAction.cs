namespace ReHUD.UpgradeActions;

public abstract class UpgradeAction {
    public Version FromVersion { get; }
    public Version ToVersion { get; }
    public abstract string Description { get; }

    protected UpgradeAction(Version fromVersion, Version toVersion) {
        FromVersion = fromVersion;
        ToVersion = toVersion;
    }

    public abstract void Upgrade();
}