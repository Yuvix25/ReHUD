import {IExtendedShared} from './consts.js';
import NamedEntity from './NamedEntity.js';
import {ESession, ESessionPhase, IDriverData} from "./r3eTypes.js";
import {SharedMemoryKey} from './SharedMemoryConsumer.js';
import {getUid} from "./utils.js";

export type EventCallbacks = {
    [EventEmitter.NEW_LAP_EVENT]?: (data: any) => void;
    [EventEmitter.POSITION_JUMP_EVENT]?: (data: any) => void;
    [EventEmitter.ENTERED_PITLANE_EVENT]?: (data: any) => void;
};

/**
 * An event emitter for some events regarding data from the Shared Memory API.
 */
export default class EventEmitter extends NamedEntity {
    public static readonly NEW_LAP_EVENT = 'newLap';
    public static readonly POSITION_JUMP_EVENT = 'positionJump';
    public static readonly ENTERED_PITLANE_EVENT = 'enteredPitlane';
    public static readonly GAME_PAUSED_EVENT = 'gamePaused';
    public static readonly GAME_RESUMED_EVENT = 'gameResumed';
    public static readonly SESSION_CHANGED_EVENT = 'sessionChanged';
    public static readonly SESSION_PHASE_CHANGED_EVENT = 'sessionPhaseChanged';
    public static readonly P2P_DEACTIVATION_EVENT = 'p2pDeactivation';
    public static readonly P2P_ACTIVATION_EVENT = 'p2pActivation';
    public static readonly P2P_READY_EVENT = 'p2pReady';
    public static readonly CAR_CHANGED_EVENT = 'carChanged';
    public static readonly TRACK_CHANGED_EVENT = 'trackChanged';
    public static readonly MAIN_DRIVER_CHANGED_EVENT = 'mainDriverChanged'; // emitted by the driver manager
    public static readonly ENTERED_REPLAY_EVENT = 'enteredReplay';
    public static readonly LEFT_REPLAY_EVENT = 'leftReplay';

    private static readonly valueListeners: {[value: string]: Array<[string, any?]>} = {
        'sessionType': [[EventEmitter.SESSION_CHANGED_EVENT, ESession]],
        'sessionPhase': [[EventEmitter.SESSION_PHASE_CHANGED_EVENT, ESessionPhase]],
        'vehicleInfo.modelId': [[EventEmitter.CAR_CHANGED_EVENT, null]],
        'layoutId': [[EventEmitter.TRACK_CHANGED_EVENT, null]],
    };
    public static readonly valueListenersReversed: {[key: string]: [string, any]} = Object.entries(EventEmitter.valueListeners).reduce((acc: {[key: string]: [string, string]}, [key, value]) => {
        for (const event of value) {
            acc[event[0]] = [key, event[1]];
        }
        return acc;
    }, {});

    override sharedMemoryKeys: SharedMemoryKey[] = ['sessionType', 'sessionPhase', 'vehicleInfo', 'layoutId', 'driverData', 'playerName', 'gameInReplay', 'gameInMenus', 'gamePaused', 'controlType', 'layoutLength', 'pushToPass'];

    override isEnabled(): boolean {
        return true;
    }

    static CLOSE_THRESHOLD = 50; // meters
    static events: {[key: string]: Array<(data: IExtendedShared) => void>} = {};
    static previousData: IExtendedShared = null;
    static uidMapPrevious: {[key: string]: IDriverData} = null;
    static newLapEvent: any;
    static enteredPitlaneEvent: any;
    static positionJumpEvent: any;

    private static getValueByPath(data: IExtendedShared, path: string): any {
        const parts = path.split('.');
        if (parts.length === 0) {
            return data;
        }

        let value = data as any;
        if (parts[0].startsWith('+')) {
            parts[0] = parts[0].slice(1);
        } else {
            value = value.rawData;
        }
        
        for (const part of parts) {
            if (value == null) {
                return null;
            }
            value = value[part];
        }
        return value;
    }

    /**
     * Listen for an event.
     * @param callback - The callback function to be called when the event is emitted. The callback function will be passed the latest data from the Shared Memory API.
     */
    static on(eventName: string, callback: (data: IExtendedShared) => void) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    /**
     * Emit an event.
     */
    static emit(eventName: string, isMainDriver: boolean | null, extendedData: IExtendedShared, ...args: any[]) {
        if (isMainDriver !== false) {
            console.log('Emitting ' + eventName + ' event.');

            let listenerData: [string, any];
            let listenerValue;
            let listenerPrevValue;
            let listenerValueMap;
            switch (eventName) {
                case EventEmitter.NEW_LAP_EVENT:
                    console.log(`New lap: ${args[0]?.completedLaps}`);
                    break;
                default:
                    listenerData = EventEmitter.valueListenersReversed[eventName];
                    if (listenerData != null) {
                        listenerPrevValue = this.getValueByPath(this.previousData, listenerData[0]);
                        listenerValue = this.getValueByPath(extendedData, listenerData[0]);
                        listenerValueMap = (value: any) => listenerData[1] == null ? value : listenerData[1][value];
                        console.log(`${eventName}: ${listenerValueMap(listenerPrevValue)} -> ${listenerValueMap(listenerValue)}`);
                    }
                    break;
            }
        }
        if (isMainDriver !== null) args.push(isMainDriver);

        const events = this.events[eventName];
        if (events) {
            events.forEach(fn => {                
                fn.call(null, extendedData, ...args);
            });
        }
    }


    /**
     * Listen for any event and emit if necessary.
     * @param data - Data from the Shared Memory API
     */
    static cycle(extendedData: IExtendedShared) {
        const data = extendedData.rawData;
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


            if (this.previousData.rawData.gameInReplay !== 1 && data.gameInReplay === 1) {
              this.emit(EventEmitter.ENTERED_REPLAY_EVENT, null, extendedData);
            }
            if (this.previousData.rawData.gameInReplay === 1 && data.gameInReplay !== 1) {
              this.emit(EventEmitter.LEFT_REPLAY_EVENT, null, extendedData);
            }

            for (const value of Object.keys(EventEmitter.valueListeners)) {
                const previousValue = EventEmitter.getValueByPath(this.previousData, value);
                const currentValue = EventEmitter.getValueByPath(extendedData, value);
                if (previousValue !== currentValue) {
                    for (const event of EventEmitter.valueListeners[value]) {
                        this.emit(event[0], null, extendedData, previousValue);
                    }
                }
            }

            if (data.controlType != null && data.controlType > 0 && this.previousData.rawData.controlType != data.controlType) { // control type change (e.g. leaderboard challenge/private qualifying reset) 0 = player
                this.emit(EventEmitter.POSITION_JUMP_EVENT, true, extendedData, newDriverMap[mainDriverUid]);
                emittedPositionJump = true;
            }

            if (data.gamePaused == 1 && this.previousData.rawData.gamePaused != 1) {
              this.emit(EventEmitter.GAME_PAUSED_EVENT, null, extendedData);
            }
            if (data.gamePaused == 0 && this.previousData.rawData.gamePaused == 1) {
              this.emit(EventEmitter.GAME_RESUMED_EVENT, null, extendedData);
            }

            if(data.pushToPass.waitTimeLeft > 0 && this.previousData.rawData.pushToPass.waitTimeLeft == 0) {
                this.emit(EventEmitter.P2P_DEACTIVATION_EVENT, null, extendedData)
            }

            if(data.pushToPass.engagedTimeLeft > 0 && this.previousData.rawData.pushToPass.engagedTimeLeft == 0) {
                this.emit(EventEmitter.P2P_ACTIVATION_EVENT, null, extendedData)
            }

            if(data.pushToPass.waitTimeLeft == 0 && this.previousData.rawData.pushToPass.waitTimeLeft > 0 && data.gameInMenus != 1 || data.pushToPass.amountLeft > 0 && this.previousData.rawData.pushToPass.amountLeft == 0) {
                this.emit(EventEmitter.P2P_READY_EVENT, null, extendedData)
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
                    || (
                    driver.completedLaps == 0 &&
                    driverPrevious.lapDistance >= data.layoutLength - EventEmitter.CLOSE_THRESHOLD &&
                    driver.lapDistance <= EventEmitter.CLOSE_THRESHOLD &&
                    (data.sessionType === ESession.Race || data.sessionType === ESession.Qualify))) {
                        toEmit = EventEmitter.NEW_LAP_EVENT;
                }

                if (driverPrevious.inPitlane !== 1 && driver.inPitlane === 1) {
                    toEmit = EventEmitter.ENTERED_PITLANE_EVENT;
                }

                if (toEmit != null) {
                    if (!(toEmit === EventEmitter.NEW_LAP_EVENT && isMainDriver) || !emittedPositionJump) {
                      this.emit(toEmit, isMainDriver, extendedData, driver);
                    }
                }
            }
        }
        
        this.previousData = extendedData;
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