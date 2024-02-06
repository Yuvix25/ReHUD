import HudElement from "./HudElement.js";
import {valueIsValidAssertNull, NA} from "../consts.js";

export default class FuelPerLap extends HudElement {
    override sharedMemoryKeys: string[] = ['+fuelPerLap'];

    protected override render(fuelPerLap: number): string {
        return valueIsValidAssertNull(fuelPerLap) ? `${fuelPerLap.toFixed(2)}` : NA;
    }
}