import {IExtendedShared} from './consts.js';
import EventEmitter from "./EventEmitter.js";
import Hud from "./Hud";
import NamedEntity from "./NamedEntity.js";
import {ESession, ESessionPhase, IDriverData, IPushToPass} from "./r3eTypes.js";

export default abstract class EventListener extends NamedEntity {
    protected hud: Hud;
    
    constructor(name: string) {
        super(name);
        EventEmitter.on(EventEmitter.NEW_LAP_EVENT, this.onNewLap.bind(this));
        EventEmitter.on(EventEmitter.POSITION_JUMP_EVENT, this.onPositionJump.bind(this));
        EventEmitter.on(EventEmitter.ENTERED_PITLANE_EVENT, this.onPitlaneEntrance.bind(this));
        EventEmitter.on(EventEmitter.LEFT_PITLANE_EVENT, this.onPitlaneExit.bind(this));
        EventEmitter.on(EventEmitter.GAME_PAUSED_EVENT, this.onGamePause.bind(this));
        EventEmitter.on(EventEmitter.GAME_RESUMED_EVENT, this.onGameResume.bind(this));
        EventEmitter.on(EventEmitter.SESSION_CHANGED_EVENT, this.onSessionChange.bind(this));
        EventEmitter.on(EventEmitter.SESSION_PHASE_CHANGED_EVENT, this.onSessionPhaseChange.bind(this));
        EventEmitter.on(EventEmitter.CAR_CHANGED_EVENT, this.onCarChange.bind(this));
        EventEmitter.on(EventEmitter.TRACK_CHANGED_EVENT, this.onTrackChange.bind(this));
        EventEmitter.on(EventEmitter.MAIN_DRIVER_CHANGED_EVENT, this.onMainDriverChange.bind(this));
        EventEmitter.on(EventEmitter.ENTERED_REPLAY_EVENT, this.onEnteredReplay.bind(this));
        EventEmitter.on(EventEmitter.LEFT_REPLAY_EVENT, this.onLeftReplay.bind(this));
        EventEmitter.on(EventEmitter.P2P_DEACTIVATION_EVENT, this.onPushToPassDeactivation.bind(this));
        EventEmitter.on(EventEmitter.P2P_ACTIVATION_EVENT, this.onPushToPassActivation.bind(this));
        EventEmitter.on(EventEmitter.P2P_READY_EVENT, this.onPushToPassReady.bind(this));
    }

    setHud(hud: Hud): void {
        this.hud = hud;

        this.onHud();
    }

    protected onHud(): void {}

    protected onNewLap(extendedData: IExtendedShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onPositionJump(extendedData: IExtendedShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onPitlaneEntrance(extendedData: IExtendedShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onPitlaneExit(extendedData: IExtendedShared, driver: IDriverData, isMainDriver: boolean) { }
    protected onSessionChange(extendedData: IExtendedShared, lastSession: ESession) { }
    protected onSessionPhaseChange(extendedData: IExtendedShared, lastSessionPhase: ESessionPhase) { }
    protected onCarChange(extendedData: IExtendedShared, lastModelId: number) { }
    protected onTrackChange(extendedData: IExtendedShared, lastLayoutId: number) { }
    protected onMainDriverChange(extendedData: IExtendedShared, lastMainDriver: IDriverData) { }
    protected onGamePause(extendedData: IExtendedShared) { }
    protected onGameResume(extendedData: IExtendedShared) { }
    protected onEnteredReplay(extendedData: IExtendedShared) { }
    protected onLeftReplay(extendedData: IExtendedShared) { }
    protected onPushToPassDeactivation(extendedData: IExtendedShared) { }
    protected onPushToPassActivation(extendedData: IExtendedShared) { }
    protected onPushToPassReady(extendedData: IExtendedShared) { }
}
