import HudElement from "./HudElement.js";
import {valueIsValidAssertNull, NA} from "../consts.js";

export default class BrakeBias extends HudElement {
    override sharedMemoryKeys: string[] = ['brakeBias'];

    protected override render(bb: number): string {
        return `BB: ${valueIsValidAssertNull(bb) ? (100 - bb * 100).toFixed(1) : NA}%`
    }
}