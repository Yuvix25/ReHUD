import HudElement from "./HudElement.js";
import {laptimeFormat} from "../consts.js";

export default class SessionLastLap extends HudElement {
    override inputKeys: string[] = ['lapTimePreviousSelf'];

    protected override render(laptime: number): string {
        return laptimeFormat(laptime);
    }
}
