import HudElement, {Hide} from "./HudElement.js";
import {valueIsValidAssertUndefined} from "../consts.js";

export default class FuelElement extends HudElement {
    override sharedMemoryKeys: string[] = ['fuelUseActive'];

    protected override render(fuelUseActive: number): string | Hide {
        if (valueIsValidAssertUndefined(fuelUseActive) && fuelUseActive > 0) {
            return null;
        }
        return this.hide();
    }
}