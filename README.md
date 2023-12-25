<div align="center">

<img src="https://raw.githubusercontent.com/Yuvix25/ReHUD/main/wwwroot/ReHUD.png" alt="ReHUD" height="170">
<h1 style="font-weight: bold">ReHUD</h1>

![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/Yuvix25/ReHUD?include_prereleases&label=Release)
![GitHub all releases](https://img.shields.io/github/downloads/Yuvix25/ReHUD/total?label=Downloads)

</div>


ReHUD is a custom, configurable, easy-to-use and easy-to-extend HUD for RaceRoom Racing Experience.

I started this project following the recent increase in the number of bugs in RaceRoom's WebHud framework, resulting in the deprecation of many loved huds, including [OtterHud](https://forum.kw-studios.com/index.php?threads/otterhud-a-custom-webhud-with-additional-features.13152/) - which is the hud I was using up until now.

---

## Current Features
 - MoTeC dash (speed, gear, revs, etc.)
 - Tire temp and tire wear status
 - Fuel insights
 - Input meter
 - Damage viewer
 - Radar
 - Position bar
 - Live delta
 - Live on-track relative display*
 - Session status*
 - Settings window:
    - Element scale and rearrangement*
    - General settings*
    - Advanced insights*

_\* work in progress_

## Planned Features
 - Manual rolling start

---

## Installation
1. Go to the [latest release](https://github.com/Yuvix25/ReHUD/releases/latest).
2. Download and run the installer.
3. Done!

Note: If you're updating from a previous version, you can simply run the new installer and it will update the app, no need to uninstall the previous version.

## Usage
Once you've installed the app, you will find a desktop shortcut to it, or you can manually find it by searching for "ReHUD" in the windows search menu. Run it with either of the above options, and you're good to go. The overlay is now running and will show up whenever you enter a session in RaceRoom.  

To change the position and scale of hud elements, go to the "Layout" tab in the settings window and choose "Edit". Now you will be able to move elements by dragging them with your mouse, and scale them by scrolling over them. After entering edit mode, a list of HUD elements with checkboxes will be activated. Enabling/disabling each HUD element will show/hide it and reset its position.  
Once you're done with your changes, choose "Save" to apply them or "Cancel" to undo.

It is recommended to set the "In Game Overlays" setting of RaceRoom under Settings->GAMEPLAY->HUD to "Essentials only", as I currently do not plan to re-implement RaceRoom's essentials.

**Please note that you must run RaceRoom in borderless-windowed or windowed mode as the HUD cannot appear on top of fullscreen apps.**

## Screenshots
<img src="https://user-images.githubusercontent.com/58216719/232799762-dbd964cc-e461-4545-9b21-749b71d136d4.png" style="max-height: 500px">

---

## Bug Reporting
Since [v0.3.1-beta](https://github.com/Yuvix25/ReHUD/releases/tag/v0.3.1-beta), the settings window contains a "Show Log File" button. If you encounter a bug/issue, create a [new issue](https://github.com/Yuvix25/ReHUD/issues/new?assignees=Yuvix25&labels=bug&projects=&template=bug_report.md&title=), fill in the template and attach the log file to it. This will help identifying the issue and fixing it as soon as possible.

## Contribution
Any contribution to the project will be highly appreciated! Feel free to open a new [issue](https://github.com/Yuvix25/ReHUD/issues/new/choose) or [pull request](https://github.com/Yuvix25/ReHUD/compare), and I'll do my best to review them and provide my own feedback.

## Special Thanks
 - [Tobias Naumann](https://twitch.tv/DasBreitschwert) - for being an early tester and providing me with a lot of great feedback.
 - [Rich Weatherill](https://www.youtube.com/@trippsix_motorsport) - for designing the ReHUD icon.
 - [OtterNas3](https://www.twitch.tv/otternas3n) - for creating [OtterHud](https://forum.kw-studios.com/index.php?threads/otterhud-a-custom-webhud-with-additional-features.13152/) - the inspiration for this project, and an amazing HUD for RaceRoom.
