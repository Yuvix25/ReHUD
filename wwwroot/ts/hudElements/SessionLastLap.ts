import HudElement from "./HudElement.js";
import {laptimeFormat} from "../consts.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class SessionLastLap extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['lapTimePreviousSelf'];

    protected override render(laptime: number): string {
        return laptimeFormat(laptime);
    }
}
