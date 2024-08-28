import HudElement from "./HudElement.js";
import {valueIsValidAssertUndefined, NA} from "../consts.js";

export default class FuelPerLap extends HudElement {
    override sharedMemoryKeys: string[] = ['+fuelPerLap'];

    protected override render(fuelPerLap: number): string {
        return valueIsValidAssertUndefined(fuelPerLap) ? `${fuelPerLap.toFixed(2)}` : NA;
    }
}