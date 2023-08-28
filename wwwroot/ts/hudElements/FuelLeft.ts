import HudElement from "../HudElement.js";
import {valueIsValid, NA} from "../consts.js";

export default class FuelLeft extends HudElement {
    override inputKeys: string[] = ['fuelLeft'];

    protected override render(fuelLeft: number): string {
        return valueIsValid(fuelLeft) ? `${fuelLeft.toFixed(1)}` : NA;
    }
}