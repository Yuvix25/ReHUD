import Action from "./Action";
import HudElement from "./HudElement";
import SettingsValue from "./SettingsValue.js";
import {SPEED_UNITS, PRESSURE_UNITS, RADAR_RANGE, DEFAULT_RADAR_RADIUS, IExtendedShared} from "./consts.js";
import IShared from "./r3eTypes";
import {AudioController} from "./utils.js";

export default class Hud {
    public isInEditMode: boolean = false;
    private normalActions: Array<Action> = new Array<Action>();
    private alwaysExecuteActions: Array<Action> = new Array<Action>();
    public readonly r3eData: any;
    public readonly radarAudioController = new AudioController({volumeMultiplier: 1});

    constructor(actions: Array<Action>) {
        // this.normalActions = actions;

        for (const action of actions) {
            action.setHud(this);

            if (action.shouldExecuteWhileHidden()) {
                this.alwaysExecuteActions.push(action);
            } else {
                this.normalActions.push(action);
            }
        }

        this.loadR3EData();

        new SettingsValue(SPEED_UNITS, 'kmh');
        new SettingsValue(PRESSURE_UNITS, 'kPa');
        new SettingsValue(RADAR_RANGE, DEFAULT_RADAR_RADIUS).onValueChanged((value) => {
            this.radarAudioController.setVolume(value);
        });
    }

    private async loadR3EData() {
        (this as any).r3eData = await (await fetch('https://raw.githubusercontent.com/sector3studios/r3e-spectator-overlay/master/r3e-data.json')).json();
    }

    public render(data: IExtendedShared, forceAll: boolean = false, isShown: boolean = true): void {
        for (const action of this.alwaysExecuteActions) {
            if (forceAll || action.shouldExecute())
                action.execute(data);
        }

        if (!isShown)
            return;
        for (const action of this.normalActions) {
            if (forceAll || action.shouldExecute()) {
                action.execute(data);
            }
        }
    }
}