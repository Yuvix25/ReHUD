using ElectronNET.API.Entities;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace ReHUD.Pages;

public class SettingsModel : PageModel
{
    public Tuple<string, string>[] Screens { get; private set; }
    public string Screen { get; private set; }

    public SettingsModel() {
        Screens = Array.Empty<Tuple<string, string>>();
        Screen = "unknown";
    }

    public async Task OnGetAsync()
    {
        var displays = await Startup.GetDisplays();
        if (displays != null)
        {
            Func<Display, string> name;
            // TODO: remove once Electron.NET is updated
            if (displays.Length > 0 && displays[0].GetType().GetProperty("Label") != null) {
                name = d => d.GetType().GetProperty("Label")?.GetValue(d) as string ?? d.Id;
            } else {
                name = d => d.Id;
            }
            Screens = displays.Select(d => new Tuple<string, string>(d.Id, name(d))).ToArray();
            Screen = await Startup.GetMainWindowDisplay() ?? (Screens.Length > 0 ? Screens[0].Item1 : Screen);
        }
    }
}