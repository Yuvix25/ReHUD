import HudElement from "./HudElement.js";
import {laptimeFormat} from "../consts.js";
import {Driver} from '../utils.js';
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class AlltimeBestLap extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = [];

    protected override render(): string {
        if (Driver.mainDriver?.bestLapTime == null || !Driver.mainDriver?.bestLapTimeValid)
            return laptimeFormat(null);
        return laptimeFormat(Driver.mainDriver.bestLapTime);
    }
}