/**
 * An event emitter for some events regarding data from the Shared Memory API.
 */
class EventEmitter {
    static NEW_LAP_EVENT = 'newLap';
    static POSITION_JUMP_EVENT = 'positionJump';
    static ENTERED_PITLANE_EVENT = 'enteredPitlane';


    static CLOSE_THRESHOLD = 100;
    static FAR_THRESHOLD = 300;


    constructor() {
        /**
         * @type {Object.<string, Array.<function>>}
         */
        this.events = {};

        this.previousData = null;
        this.lapStarted = false;
    }

    /**
     * Listen for an event.
     * @param {string} eventName
     * @param {function(object): void} callback - The callback function to be called when the event is emitted. The callback function will be passed the latest data from the Shared Memory API.
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    /**
     * Emit an event.
     * @param {string} eventName
     * @param {object} data
     */
    emit(eventName, data) {
        switch (eventName) {
            case EventEmitter.newLapEvent:
                this.lapStarted = true;
                break;
            case EventEmitter.enteredPitlaneEvent:
            case EventEmitter.positionJumpEvent:
                this.lapStarted = false;
                break;
        }

        data = Object.assign({}, data);
        data.lapStarted = this.lapStarted;

        const event = this.events[eventName];
        if (event) {
            event.forEach(fn => {
                fn.call(null, data);
            });
        }
    }


    /**
     * Listen for any event and emit if necessary.
     * @param {object} data - Data from the Shared Memory API
     */
    cycle(data) {
        const timestamp = Date.now();
        if (this.previousData != null) {
            if (this.previousData.completedLaps !== data.completedLaps && (this.previousData.completedLaps == null || data.completedLaps > this.previousData.completedLaps)) {
                this.emit(EventEmitter.NEW_LAP_EVENT, data);
            } else if (data.completedLaps == undefined
                && this.previousData.lapDistance >= data.layoutLength - EventEmitter.CLOSE_THRESHOLD
                && data.lapDistance <= EventEmitter.CLOSE_THRESHOLD) { // lap 1 has completedLaps == undefined for some reason
                this.emit(EventEmitter.NEW_LAP_EVENT, data);
            }

            else if (EventEmitter.trackDistance(data.layoutLength, this.previousData.lapDistance, data.lapDistance) > EventEmitter.FAR_THRESHOLD // literal distance jump
                || (data.controlType != null && data.controlType > 0 && this.previousData.controlType == 0)) { // control type change (e.g. leaderboard challenge/private qualifying reset) 0 = player
                this.emit(EventEmitter.POSITION_JUMP_EVENT, data);
            }

            if (this.previousData.inPitLane == false && data.inPitLane == true) {
                this.emit(EventEmitter.ENTERED_PITLANE_EVENT, data);
            }
        }
        
        this.previousData = data;
        this.previousData.timestamp = timestamp;
    }


    /**
     * Get the shortest distance between two points on a track.
     * @param {number} trackLength
     * @param {number} point1
     * @param {number} point2
     * @return {number}
     */
    static trackDistance(trackLength, point1, point2) {
        if (point1 == null || point2 == null) {
            return 0;
        }
        const a = Math.abs(point1 - point2);
        const b = trackLength - a;
        return Math.min(a, b);
    }
}