import EventEmitter from "./EventEmitter.js";
import Hud from "./Hud";
import {IExtendedShared} from "./consts.js";
import IShared, {IDriverData} from "./r3eTypes";

export default abstract class Action {
    protected lastExecution: number = -1;
    protected hud: Hud;
    protected readonly executeEvery: number;

    protected readonly executeWhileHidden: boolean = false;

    public shouldExecuteWhileHidden() {
        return this.executeWhileHidden;
    }
    
    constructor(executeEvery: number = null) {
        this.executeEvery = executeEvery;

        EventEmitter.on(EventEmitter.NEW_LAP_EVENT, this.onNewLap.bind(this));
        EventEmitter.on(EventEmitter.POSITION_JUMP_EVENT, this.onPositionJump.bind(this));
        EventEmitter.on(EventEmitter.ENTERED_PITLANE_EVENT, this.onPitlaneEntrance.bind(this));
    }

    shouldExecute(): boolean {
        const now = Date.now();
        return this.executeEvery == null || this.lastExecution + this.executeEvery <= now;
    }

    setHud(hud: Hud): void {
        this.hud = hud;
    }

    abstract execute(data: IExtendedShared): void;

    protected onNewLap(data: IShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onPositionJump(data: IShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onPitlaneEntrance(data: IShared, driver: IDriverData, isMainDriver: boolean) { }
}
