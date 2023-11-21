import HudElement from "./HudElement.js";
import {laptimeFormat} from "../consts.js";
import {Driver} from '../utils.js';

export default class AlltimeBestLap extends HudElement {
    override inputKeys: string[] = [];

    protected override render(): string {
        if (Driver.mainDriver?.bestLapTime == null || !Driver.mainDriver?.bestLapTimeValid)
            return laptimeFormat(null);
        return laptimeFormat(Driver.mainDriver.bestLapTime);
    }
}