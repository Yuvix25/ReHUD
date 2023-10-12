import Action from "./Action";
import SettingsValue from "./SettingsValue.js";
import DriverManager from "./actions/DriverManager.js";
import RankedData from "./actions/RankedData.js";
import TireManager from './actions/TireManager.js';
import {SPEED_UNITS, PRESSURE_UNITS, RADAR_RANGE, DEFAULT_RADAR_RADIUS, IExtendedShared, RADAR_BEEP_VOLUME, RELATIVE_SAFE_MODE} from "./consts.js";
import {AudioController} from "./utils.js";

export default class Hud {
    public isInEditMode: boolean = false;
    public actionServices: Action[] = [];
    public rankedDataService: RankedData = new RankedData();
    public driverManagerService: DriverManager = new DriverManager();
    public tireManagerService: TireManager = new TireManager();

    private normalActions: Array<Action> = new Array<Action>();
    private alwaysExecuteActions: Array<Action> = new Array<Action>();
    public readonly r3eData: any;
    public readonly radarAudioController = new AudioController({volumeMultiplier: 1});

    private registerService(action: Action): void {
        this.actionServices.push(action);
    }

    constructor(positionalActions: Action[]) {
        this.registerService(this.driverManagerService);
        this.registerService(this.tireManagerService);

        for (const action of positionalActions.concat(this.actionServices)) {
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
        new SettingsValue(RADAR_RANGE, DEFAULT_RADAR_RADIUS);
        new SettingsValue(RADAR_BEEP_VOLUME, 1.5).onValueChanged((value) => {
            this.radarAudioController.setVolume(value);
        });
        new SettingsValue(RELATIVE_SAFE_MODE, false);
    }

    private async loadR3EData() {
        (this as any).r3eData = await (await fetch('https://raw.githubusercontent.com/sector3studios/r3e-spectator-overlay/master/r3e-data.json')).json();
    }

    private static executeAction(action: Action, data: IExtendedShared): void {
        try {
            action._execute(data);
        } catch (e) {
            console.error('Error while executing action', action.toString(), e.toString());
        }
    }

    public render(data: IExtendedShared, forceAll: boolean = false, isShown: boolean = true): void {
        (window as any).r3eData = data; // for debugging
        for (const action of this.alwaysExecuteActions) {
            if (forceAll || action.shouldExecute()) {
                Hud.executeAction(action, data);
            }
        }

        if (!isShown)
            return;
        for (const action of this.normalActions) {
            if (forceAll || action.shouldExecute()) {
                Hud.executeAction(action, data);
            }
        }
    }
}