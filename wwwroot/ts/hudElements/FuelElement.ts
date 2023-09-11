import HudElement, {Hide} from "./HudElement.js";
import {valueIsValid} from "../consts.js";

export default class FuelElement extends HudElement {
    override inputKeys: string[] = ['fuelUseActive'];

    protected override render(fuelUseActive: number): string | Hide {
        if (valueIsValid(fuelUseActive) && fuelUseActive > 0) {
            return null;
        }
        return this.hide();
    }
}