import HudElement from "./HudElement.js";
import {laptimeFormat} from "../consts.js";

export default class CurrentLaptime extends HudElement {
    override inputKeys: string[] = ['lapTimeCurrentSelf'];

    protected override render(laptime: number): string {
        return laptimeFormat(laptime, true);
    }
}
