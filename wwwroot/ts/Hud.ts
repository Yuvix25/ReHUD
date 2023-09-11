import Action from "./Action";
import EventListener from "./EventListener.js";
import SettingsValue from "./SettingsValue.js";
import {SPEED_UNITS, PRESSURE_UNITS, RADAR_RANGE, DEFAULT_RADAR_RADIUS, IExtendedShared, RADAR_BEEP_VOLUME, RELATIVE_SAFE_MODE} from "./consts.js";
import {AudioController} from "./utils.js";

export default class Hud {
    public isInEditMode: boolean = false;
    public namedEventListeners: {[key: string]: EventListener} = {};
    public namedActions: {[key: string]: Action} = {};
    private normalActions: Array<Action> = new Array<Action>();
    private alwaysExecuteActions: Array<Action> = new Array<Action>();
    public readonly r3eData: any;
    public readonly radarAudioController = new AudioController({volumeMultiplier: 1});

    constructor(eventListeners: {[key: string]: EventListener}, namedActions: {[key: string]: Action}, positionalActions: Action[]) {
        const initializeAction = (action: Action) => {
            action.setHud(this);

            if (action.shouldExecuteWhileHidden()) {
                this.alwaysExecuteActions.push(action);
            } else {
                this.normalActions.push(action);
            }
        };

        this.namedEventListeners = eventListeners;
        for (const eventListener in eventListeners) {
            eventListeners[eventListener].setHud(this);
        }

        this.namedActions = namedActions;
        for (const actionName in namedActions) {
            initializeAction(namedActions[actionName]);
        }
        for (const action of positionalActions) {
            initializeAction(action);
        }

        this.loadR3EData();

        new SettingsValue(SPEED_UNITS, 'kmh');
        new SettingsValue(PRESSURE_UNITS, 'kPa');
        new SettingsValue(RADAR_RANGE, DEFAULT_RADAR_RADIUS);
        new SettingsValue(RADAR_BEEP_VOLUME, 1.5).onValueChanged((value) => {
            this.radarAudioController.setVolume(value);
        });
        new SettingsValue(RELATIVE_SAFE_MODE, false);
    }

    private async loadR3EData() {
        (this as any).r3eData = await (await fetch('https://raw.githubusercontent.com/sector3studios/r3e-spectator-overlay/master/r3e-data.json')).json();
    }

    public render(data: IExtendedShared, forceAll: boolean = false, isShown: boolean = true): void {
        (window as any).r3eData = data; // for debugging
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