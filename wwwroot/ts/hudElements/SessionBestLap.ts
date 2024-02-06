import HudElement from "./HudElement.js";
import {laptimeFormat} from "../consts.js";

export default class SessionBestLap extends HudElement {
    override sharedMemoryKeys: string[] = ['lapTimeBestSelf'];

    protected override render(laptime: number): string {
        return laptimeFormat(laptime);
    }
}