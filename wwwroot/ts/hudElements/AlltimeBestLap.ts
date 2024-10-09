import HudElement from "./HudElement.js";
import {laptimeFormat} from "../consts.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class AlltimeBestLap extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['+allTimeBestLapTime'];

    protected override render(allTimeBest: number): string {
        return laptimeFormat(allTimeBest);
    }
}