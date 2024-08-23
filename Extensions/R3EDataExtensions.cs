using R3E.Data;

namespace ReHUD.Extensions
{
    public static class R3EDataExtensions
    {
        internal static bool IsNotDriving(this R3EData data) => data.gameInMenus == 1 || (data.gamePaused == 1 && data.gameInReplay == 0) || data.sessionType == -1;
        internal static bool IsDriving(this R3EData data) => !data.IsNotDriving();
    }
}
