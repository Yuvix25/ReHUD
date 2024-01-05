import EventEmitter from "./EventEmitter.js";
import Hud from "./Hud";
import NamedEntity from "./NamedEntity.js";
import IShared, {ESession, ESessionPhase, IDriverData, IPushToPass} from "./r3eTypes.js";

export default abstract class EventListener extends NamedEntity {
    protected hud: Hud;
    
    constructor(name: string) {
        super(name);
        EventEmitter.on(EventEmitter.NEW_LAP_EVENT, this.onNewLap.bind(this));
        EventEmitter.on(EventEmitter.POSITION_JUMP_EVENT, this.onPositionJump.bind(this));
        EventEmitter.on(EventEmitter.ENTERED_PITLANE_EVENT, this.onPitlaneEntrance.bind(this));
        EventEmitter.on(EventEmitter.GAME_PAUSED_EVENT, this.onGamePause.bind(this));
        EventEmitter.on(EventEmitter.GAME_RESUMED_EVENT, this.onGameResume.bind(this));
        EventEmitter.on(EventEmitter.SESSION_CHANGED_EVENT, this.onSessionChange.bind(this));
        EventEmitter.on(EventEmitter.SESSION_PHASE_CHANGED_EVENT, this.onSessionPhaseChange.bind(this));
        EventEmitter.on(EventEmitter.P2P_DEACTIVATION_EVENT, this.onPushToPassDeactivation.bind(this));
        EventEmitter.on(EventEmitter.P2P_ACTIVATION_EVENT, this.onPushToPassActivation.bind(this));
        EventEmitter.on(EventEmitter.P2P_READY_EVENT, this.onPushToPassReady.bind(this));
    }

    setHud(hud: Hud): void {
        this.hud = hud;

        this.onHud();
    }

    protected onHud(): void {}

    protected onNewLap(data: IShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onPositionJump(data: IShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onPitlaneEntrance(data: IShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onSessionChange(data: IShared, lastSession: ESession) { }
    protected onSessionPhaseChange(data: IShared, lastSessionPhase: ESessionPhase) { }
    protected onGamePause(data: IShared) { }
    protected onGameResume(data: IShared) { }
    protected onPushToPassDeactivation(data: IShared, pushToPass: IPushToPass) { }
    protected onPushToPassActivation(data: IShared, pushToPass: IPushToPass) { }
    protected onPushToPassReady(data: IShared) { }
}
