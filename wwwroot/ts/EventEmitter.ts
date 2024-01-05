import IShared, {ESession, ESessionPhase, IDriverData} from "./r3eTypes.js";
import {getUid} from "./utils.js";

export type EventCallbacks = {
    [EventEmitter.NEW_LAP_EVENT]?: (data: any) => void;
    [EventEmitter.POSITION_JUMP_EVENT]?: (data: any) => void;
    [EventEmitter.ENTERED_PITLANE_EVENT]?: (data: any) => void;
};

/**
 * An event emitter for some events regarding data from the Shared Memory API.
 */
export default class EventEmitter {
    static readonly NEW_LAP_EVENT = 'newLap';
    static readonly POSITION_JUMP_EVENT = 'positionJump';
    static readonly ENTERED_PITLANE_EVENT = 'enteredPitlane';
    static readonly GAME_PAUSED_EVENT = 'gamePaused';
    static readonly GAME_RESUMED_EVENT = 'gameResumed';
    static readonly SESSION_CHANGED_EVENT = 'sessionChanged';
    static readonly SESSION_PHASE_CHANGED_EVENT = 'sessionPhaseChanged';
    static readonly P2P_DEACTIVATION_EVENT = 'p2pDeactivation';
    static readonly P2P_ACTIVATION_EVENT = 'p2pActivation';
    static readonly P2P_READY_EVENT = 'p2pReady';


    static CLOSE_THRESHOLD = 50; // meters
    static events: {[key: string]: Array<(data: any) => void>} = {};
    static previousData: IShared = null;
    static uidMapPrevious: {[key: string]: IDriverData} = null;
    static newLapEvent: any;
    static enteredPitlaneEvent: any;
    static positionJumpEvent: any;

    /**
     * Listen for an event.
     * @param callback - The callback function to be called when the event is emitted. The callback function will be passed the latest data from the Shared Memory API.
     */
    static on(eventName: string, callback: (data: any) => void) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    /**
     * Emit an event.
     */
    static emit(eventName: string, isMainDriver: boolean | null, data: any, ...args: any[]) {
        if (isMainDriver !== false) {
            console.log('Emitting ' + eventName + ' event.');

            switch (eventName) {
                case EventEmitter.SESSION_CHANGED_EVENT:
                    console.log(`Session changed: ${ESession[this.previousData.sessionType]} -> ${ESession[data.sessionType]}`)
                    break;
                case EventEmitter.SESSION_PHASE_CHANGED_EVENT:
                    console.log(
                      `Session phase changed: ${
                        ESessionPhase[this.previousData.sessionPhase]
                      } -> ${ESessionPhase[data.sessionPhase]}`
                    );
                    break;
                case EventEmitter.NEW_LAP_EVENT:
                    console.log(`New lap: ${args[0]?.completedLaps}`);
            }
        }
        if (isMainDriver !== null) args.push(isMainDriver);

        const events = this.events[eventName];
        if (events) {
            events.forEach(fn => {                
                fn.call(null, data, ...args);
            });
        }
    }


    /**
     * Listen for any event and emit if necessary.
     * @param data - Data from the Shared Memory API
     */
    static cycle(data: IShared) {
        const timestamp = Date.now();

        const newDriverMap: {[key: string]: IDriverData} = {};
        for (const driver of data.driverData) {
            newDriverMap[getUid(driver.driverInfo)] = driver;
        }

        if (this.previousData != null) {
            const mainDriverInfo = structuredClone(data.vehicleInfo);
            mainDriverInfo.name = data.playerName;
            const mainDriverUid = getUid(mainDriverInfo);

            let emittedPositionJump = false;


            if (this.previousData.sessionType !== data.sessionType) {
                this.emit(EventEmitter.SESSION_CHANGED_EVENT, null, data, this.previousData.sessionType);
            }
            if (this.previousData.sessionPhase !== data.sessionPhase) {
                this.emit(EventEmitter.SESSION_PHASE_CHANGED_EVENT, null, data, this.previousData.sessionPhase);
            }

            if (data.controlType != null && data.controlType > 0 && this.previousData.controlType != data.controlType) { // control type change (e.g. leaderboard challenge/private qualifying reset) 0 = player
                this.emit(EventEmitter.POSITION_JUMP_EVENT, true, data, newDriverMap[mainDriverUid]);
                emittedPositionJump = true;
            }

            if (data.gamePaused == 1 && this.previousData.gamePaused != 1) {
              this.emit(EventEmitter.GAME_PAUSED_EVENT, null, data);
            }
            if (data.gamePaused == 0 && this.previousData.gamePaused == 1) {
              this.emit(EventEmitter.GAME_RESUMED_EVENT, null, data);
            }

            if(data.pushToPass.waitTimeLeft > 0 && this.previousData.pushToPass.waitTimeLeft == 0) {
                this.emit(EventEmitter.P2P_DEACTIVATION_EVENT, null, data)
            }

            if(data.pushToPass.engagedTimeLeft > 0 && this.previousData.pushToPass.engagedTimeLeft == 0) {
                this.emit(EventEmitter.P2P_ACTIVATION_EVENT, null, data)
            }
            
            if(data.pushToPass.waitTimeLeft == 0 && this.previousData.pushToPass.waitTimeLeft > 0 && data.gameInMenus != 1 || data.pushToPass.amountLeft > 0 && this.previousData.pushToPass.amountLeft == 0) {
                this.emit(EventEmitter.P2P_READY_EVENT, null, data)
            }

            for (const uid of Object.keys(newDriverMap)) {
                const driver = newDriverMap[uid];
                const driverPrevious = this.uidMapPrevious[uid];

                if (driverPrevious == null) {
                    continue;
                }

                const isMainDriver = uid === mainDriverUid;

                let toEmit: string = null;

                if ((driverPrevious.completedLaps !== driver.completedLaps && (driverPrevious.completedLaps == null || driver.completedLaps > driverPrevious.completedLaps))
                    ||
                    (driver.completedLaps == 0
                    && driverPrevious.lapDistance >= data.layoutLength - EventEmitter.CLOSE_THRESHOLD
                    && driver.lapDistance <= EventEmitter.CLOSE_THRESHOLD
                    && (data.sessionType === ESession.Race || data.sessionType === ESession.Qualify))) {
                        toEmit = EventEmitter.NEW_LAP_EVENT;
                }

                if (driverPrevious.inPitlane !== 1 && driver.inPitlane === 1) {
                    toEmit = EventEmitter.ENTERED_PITLANE_EVENT;
                }

                if (toEmit != null) {
                    if (!(toEmit === EventEmitter.NEW_LAP_EVENT && isMainDriver) || !emittedPositionJump) {
                      this.emit(toEmit, isMainDriver, data, driver);
                    }
                }
            }
        }
        
        this.previousData = data;
        (this.previousData as any).timestamp = timestamp;
        this.uidMapPrevious = newDriverMap;
    }


    /**
     * Get the shortest distance between two points on a track.
     */
    static trackDistance(trackLength: number, point1: number, point2: number): number {
        if (point1 == null || point2 == null) {
            return 0;
        }
        const a = Math.abs(point1 - point2);
        const b = trackLength - a;
        return Math.min(a, b);
    }
}