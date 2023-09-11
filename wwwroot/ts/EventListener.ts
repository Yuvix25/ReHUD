import EventEmitter from "./EventEmitter.js";
import Hud from "./Hud";
import IShared, {ESession, IDriverData} from "./r3eTypes.js";

export default abstract class EventListener {
    protected hud: Hud;
    
    constructor() {
        EventEmitter.on(EventEmitter.NEW_LAP_EVENT, this.onNewLap.bind(this));
        EventEmitter.on(EventEmitter.POSITION_JUMP_EVENT, this.onPositionJump.bind(this));
        EventEmitter.on(EventEmitter.ENTERED_PITLANE_EVENT, this.onPitlaneEntrance.bind(this));
        EventEmitter.on(EventEmitter.SESSION_CHANGED_EVENT, this.onSessionChange.bind(this));
    }

    setHud(hud: Hud): void {
        this.hud = hud;

        this.onHud();
    }

    protected onHud(): void {};

    protected onNewLap(data: IShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onPositionJump(data: IShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onPitlaneEntrance(data: IShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onSessionChange(data: IShared, lastSession: ESession) { }
}
