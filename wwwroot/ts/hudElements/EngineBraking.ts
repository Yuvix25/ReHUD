import HudElement from "./HudElement.js";
import {valueIsValidAssertNull, NA} from "../consts.js";

export default class EngineBraking extends HudElement {
    override sharedMemoryKeys: string[] = ['engineBrakeSetting'];

    protected override render(eb: number): string {
        return `EB: ${valueIsValidAssertNull(eb) ? eb : NA}`
    }
}