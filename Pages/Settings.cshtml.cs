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
            static string name(Display d) => d.Label;
            Screens = displays.Select(d => new Tuple<string, string>(d.Id, name(d))).ToArray();
            Screen = await Startup.GetMainWindowDisplay() ?? (Screens.Length > 0 ? Screens[0].Item1 : Screen);
        }
    }
}