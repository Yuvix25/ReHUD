import HudElement from "./HudElement.js";
import {valueIsValid, NA} from "../consts.js";

export default class FuelPerLap extends HudElement {
    override inputKeys: string[] = ['+fuelPerLap'];

    protected override render(fuelPerLap: number): string {
        return valueIsValid(fuelPerLap) ? `${fuelPerLap.toFixed(2)}` : NA;
    }
}