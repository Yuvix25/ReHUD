import HudElement from "../HudElement.js";
import {valueIsValid, NA} from "../consts.js";

export default class BrakeBias extends HudElement {
    override inputKeys: string[] = ['brakeBias'];

    protected override render(bb: number): string {
        return `BB: ${valueIsValid(bb) ? (100 - bb * 100).toFixed(1) : NA}%`
    }
}