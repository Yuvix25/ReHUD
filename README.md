<div align="center">

<img src="https://raw.githubusercontent.com/Yuvix25/ReHUD/main/wwwroot/ReHUD.png" alt="ReHUD" height="170">
<h1 style="font-weight: bold">ReHUD</h1>

[![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/Yuvix25/ReHUD?include_prereleases&label=release)](https://github.com/Yuvix25/ReHUD/releases/latest)
![GitHub all releases](https://img.shields.io/github/downloads/Yuvix25/ReHUD/total?label=downloads)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Yuvix25_ReHUD&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Yuvix25_ReHUD)

</div>


ReHUD is a custom, configurable, easy-to-use and easy-to-extend HUD for RaceRoom Racing Experience.

I started this project because more and more bugs began to appear in [OtterHud](https://forum.kw-studios.com/index.php?threads/otterhud-a-custom-webhud-with-additional-features.13152/), the hud I was using up until now, and an amazing one.

---

## Current Features
 - MoTeC dash (speed, gear, revs, etc.)
 - Tire temp and tire wear status
 - Fuel calculator
 - Input meter
 - Damage viewer
 - Radar
 - Position bar
 - Live delta
 - Position bar
 - TV tower
 - Session status
 - Pit timer
 - Live rake visualizer
 - DRS and P2P indicators
 - Live on-track relative display*
 - Settings window:
    - Element scale and rearrangement*
    - Layout presets*
    - General settings*

_\* work in progress_

## Planned Features
 - Manual rolling start
 - Input graphs
 - Advanced telemetry

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

## Layout Presets
You can save and load layout presets to easily switch between different layouts. To create a new preset, go to the "Layout" tab in the settings window and click on the "+" button. To rename a preset, choose it, click on the "Edit" button, modify the name and click on "Save". To delete a preset, click on the trash can icon next to it.
All presets are saved in the `Documents/ReHUD/layoutPresets` folder as `.json` files. You shouldn't modify these files manually, but if you really want to, do it while the app is not running.
### Replay Preset
The replay preset is a special preset that is automatically loaded when you enter a replay. To mark a preset as the replay preset, choose it, click on the "Edit" button and toggle the "Replay Preset" toggle. Note that only one preset can be marked as the replay preset at a time, and that the replay preset will be automatically unmarked if you mark another preset as the replay preset.
### Preset Command Line Argument
You can also load a preset by passing the `--preset <preset name>` command line argument to the app. This can be useful if you want to create a shortcut to the app that loads a specific preset. For example, if you want to run ReHUD and automatically load the "Race" preset, you can run the following command:
```sh
$ ReHUD.exe /args --preset=Race
```

## Screenshots
<img src="https://github.com/Yuvix25/ReHUD/assets/58216719/ac2dfb89-0019-4142-857e-60d9c89a1972" width="800">
<br/>
<img src="https://github.com/Yuvix25/ReHUD/assets/58216719/ad0ecfcc-7a0a-4f2d-99b9-5b20e06d44be" width="400">
<img src="https://github.com/Yuvix25/ReHUD/assets/58216719/6956531f-a5cb-4c03-80c0-b56d4f7784ae" width="400">

---

## Bug Reporting
Since [v0.3.1-beta](https://github.com/Yuvix25/ReHUD/releases/tag/v0.3.1-beta), the settings window contains a "Show Log File" button. If you encounter a bug/issue, create a [new issue](https://github.com/Yuvix25/ReHUD/issues/new?assignees=Yuvix25&labels=bug&projects=&template=bug_report.md&title=), fill in the template and attach the log file to it. This will help identifying the issue and fixing it as soon as possible.

## Contribution
Any contribution to the project will be highly appreciated! Feel free to open a new [issue](https://github.com/Yuvix25/ReHUD/issues/new/choose) or [pull request](https://github.com/Yuvix25/ReHUD/compare), and I'll do my best to review them and provide my own feedback.


## Developer Notes
This section is only relevant if you want to contribute to the project, or if you want to build the app yourself. If you just want to use the app, you can ignore this section.
### Electron.NET
This project is built using Electron.NET, which is a .NET wrapper for Electron. This means that the app is built using C# and .NET, but is run using Electron. This allows for a lot of flexibility and ease of development, as well as the ability to use any npm package in the app. However, Electron.NET is not updated very often - which means that I had to manually add some features to it, such as display names. To develop ReHUD locally, you need to use my fork of Electron.NET (and specifically the `ReHUD/main` branch) which can be found [here](https://github.com/Yuvix25/Electron.NET/tree/ReHUD/main).


## Special Thanks
 - [Tobias Naumann](https://twitch.tv/DasBreitschwert) - for being an early tester and providing me with a lot of great feedback.
 - [Rich Weatherill](https://www.youtube.com/@trippsix_motorsport) - for designing the ReHUD icon.
 - [OtterNas3](https://www.twitch.tv/otternas3n) - for creating [OtterHud](https://forum.kw-studios.com/index.php?threads/otterhud-a-custom-webhud-with-additional-features.13152/) - the inspiration for this project and an amazing HUD for RaceRoom.
 - [Rich Evans](https://github.com/rcbevans) - for helping with the development and introducing significant performance improvements.
 - [Colin Blankenburg](https://github.com/Colin-Blankenburg) - for helping with the development and doing lots of testing.