import HudElement from "./HudElement.js";
import {laptimeFormat} from "../consts.js";

export default class SessionLastLap extends HudElement {
    override sharedMemoryKeys: string[] = ['lapTimePreviousSelf'];

    protected override render(laptime: number): string {
        return laptimeFormat(laptime);
    }
}
