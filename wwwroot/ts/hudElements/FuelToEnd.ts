import HudElement from "./HudElement.js";
import {NA, valuesAreValid} from "../consts.js";

export default class FuelToEnd extends HudElement {
    override sharedMemoryKeys: string[] = ['+lapsUntilFinish', '+fuelPerLap'];

    protected override render(lapsUntilFinish: number, fuelPerLap: number): string {
        if (!valuesAreValid(lapsUntilFinish, fuelPerLap))
            return NA;
        return `${(lapsUntilFinish * fuelPerLap).toFixed(1)}`;
    }
}