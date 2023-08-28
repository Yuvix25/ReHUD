import HudElement from "../HudElement.js";
import {valueIsValid, NA} from "../consts.js";

export default class EngineBraking extends HudElement {
    override inputKeys: string[] = ['engineBrakeSetting'];

    protected override render(eb: number): string {
        return `EB: ${valueIsValid(eb) ? eb : NA}`
    }
}