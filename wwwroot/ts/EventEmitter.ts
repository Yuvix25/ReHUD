import {IExtendedShared} from './consts.js';
import NamedEntity from './NamedEntity.js';
import {ESession, ESessionPhase, IDriverData} from "./r3eTypes.js";
import {SharedMemoryKey} from './SharedMemoryConsumer.js';
import {getUid} from "./utils.js";


/**
 * An event emitter for some events regarding data from the Shared Memory API.
 */
export default class EventEmitter extends NamedEntity {
    public static readonly NEW_LAP_EVENT = 'NewLap';
    public static readonly POSITION_JUMP_EVENT = 'PositionJump';
    public static readonly SESSION_CHANGED_EVENT = 'SessionChange';
    public static readonly SESSION_PHASE_CHANGED_EVENT = 'SessionPhaseChange';
    public static readonly CAR_CHANGED_EVENT = 'CarChange';
    public static readonly TRACK_CHANGED_EVENT = 'TrackChange';
    public static readonly MAIN_DRIVER_CHANGED_EVENT = 'MainDriverChange';
    public static readonly GAME_PAUSED_EVENT = 'GamePause';
    public static readonly GAME_RESUMED_EVENT = 'GameResume';
    public static readonly ENTERED_REPLAY_EVENT = 'EnterReplay';
    public static readonly LEFT_REPLAY_EVENT = 'ExitReplay';
    public static readonly ENTERED_PITLANE_EVENT = 'EnterPitlane';
    public static readonly LEFT_PITLANE_EVENT = 'ExitPitlane';
    public static readonly P2P_ACTIVATION_EVENT = 'PushToPassActivate';
    public static readonly P2P_DEACTIVATION_EVENT = 'PushToPassDeactivate';
    public static readonly P2P_READY_EVENT = 'PushToPassReady';

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

    override sharedMemoryKeys: SharedMemoryKey[] = ['+events', 'sessionType', 'sessionPhase', 'vehicleInfo', 'layoutId', 'driverData', 'playerName', 'gameInReplay', 'gameInMenus', 'gamePaused', 'controlType', 'layoutLength', 'pushToPass'];

    override isEnabled(): boolean {
        return true;
    }

    static CLOSE_THRESHOLD = 50; // meters
    static events: {[key: string]: Array<(data: IExtendedShared) => void>} = {};
    static previousData: IExtendedShared = null;

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
     * Forward events from the backend.
     */
    static cycle(extendedData: IExtendedShared) {
        if (this.previousData != null) {
            for (const event of (extendedData.events ?? [])) {
                if ("OldValue" in event) {
                    this.emit(event.EventName, null, extendedData, event.OldValue);
                } else if ("Driver" in event) {
                    this.emit(event.EventName, event.IsMainDriver, extendedData, event.Driver);
                } else {
                    this.emit(event.EventName, null, extendedData);
                }
            }
        }
        this.previousData = extendedData;
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