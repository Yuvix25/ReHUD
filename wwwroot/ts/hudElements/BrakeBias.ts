import HudElement from "./HudElement.js";
import {valueIsValidAssertUndefined, NA} from "../consts.js";

export default class BrakeBias extends HudElement {
    override sharedMemoryKeys: string[] = ['brakeBias'];

    protected override render(bb: number): string {
        return `BB: ${valueIsValidAssertUndefined(bb) ? (100 - bb * 100).toFixed(1) : NA}%`
    }
}