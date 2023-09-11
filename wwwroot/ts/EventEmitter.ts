import IShared, {ESession, IDriverData} from "./r3eTypes.js";
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
    static readonly SESSION_CHANGED_EVENT = 'sessionChanged';


    static CLOSE_THRESHOLD = 100;
    static FAST_THRESHOLD = 500; // km/h
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
    static emit(eventName: string, data: any, ...args: any[]) {
        console.log('Emitting ' + eventName + ' event.');

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

        let emittedNewLapOrPosJumpForMainDriver = false;
        if (this.previousData != null) {
            if (this.previousData.sessionType !== data.sessionType) {
                this.emit(EventEmitter.SESSION_CHANGED_EVENT, data, this.previousData.sessionType);
            }

            const mainDriverInfo = structuredClone(data.vehicleInfo);
            mainDriverInfo.name = data.playerName;
            const mainDriverUid = getUid(mainDriverInfo);
            for (const uid of Object.keys(newDriverMap)) {
                const driver = newDriverMap[uid];
                const driverPrevious = this.uidMapPrevious[uid];

                if (driverPrevious == null) {
                    continue;
                }

                const isMainDriver = uid === mainDriverUid;

                const emitNewLapOrPosJump = (ev: typeof EventEmitter.NEW_LAP_EVENT | typeof EventEmitter.POSITION_JUMP_EVENT) => {
                    if (isMainDriver) {
                        emittedNewLapOrPosJumpForMainDriver = true;
                    }
                    this.emit(ev, data, driver, isMainDriver);
                }

                if (driverPrevious.completedLaps !== driver.completedLaps && (driverPrevious.completedLaps == null || driver.completedLaps > driverPrevious.completedLaps)) {
                    emitNewLapOrPosJump(EventEmitter.NEW_LAP_EVENT);
                } else if (driver.completedLaps == 0
                    && driverPrevious.lapDistance >= data.layoutLength - EventEmitter.CLOSE_THRESHOLD
                    && driver.lapDistance <= EventEmitter.CLOSE_THRESHOLD
                    && data.sessionType === ESession.Race) {
                    emitNewLapOrPosJump(EventEmitter.NEW_LAP_EVENT);
                }

                if (driverPrevious.inPitlane !== 1 && driver.inPitlane === 1) {
                    this.emit(EventEmitter.ENTERED_PITLANE_EVENT, data, driver, isMainDriver);
                }
            }

            if (!emittedNewLapOrPosJumpForMainDriver && (data.controlType != null && data.controlType > 0 && this.previousData.controlType != data.controlType)) { // control type change (e.g. leaderboard challenge/private qualifying reset) 0 = player
                this.emit(EventEmitter.POSITION_JUMP_EVENT, data, newDriverMap[mainDriverUid], true);
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