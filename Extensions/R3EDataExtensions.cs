using R3E.Data;

namespace ReHUD.Extensions
{
    public static class R3EDataExtensions
    {
        internal static bool IsInMenus(this R3EData data) => data.gameInMenus == 1 || (data.gamePaused == 1 && data.gameInReplay == 0) || data.sessionType == -1;
        internal static bool IsInGame(this R3EData data) => !data.IsInMenus();
        internal static bool IsDriving(this R3EData data) => data.IsInGame() && data.controlType == 0 && data.gameInReplay == 0;
        internal static bool IsNotDriving(this R3EData data) => !data.IsDriving();
    }
}
