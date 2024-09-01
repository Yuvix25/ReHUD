import HudElement from "./HudElement.js";
import {laptimeFormat} from "../consts.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class SessionBestLap extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['lapTimeBestSelf'];

    protected override render(laptime: number): string {
        return laptimeFormat(laptime);
    }
}