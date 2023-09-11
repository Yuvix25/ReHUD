import HudElement from "./HudElement.js";
import {NA, allValuesAreValid} from "../consts.js";

export default class FuelToEnd extends HudElement {
    override inputKeys: string[] = ['+lapsUntilFinish', '+fuelPerLap'];

    protected override render(fuelLeft: number, fuelPerLap: number): string {
        if (!allValuesAreValid(fuelLeft, fuelPerLap))
            return NA;
        return `${(fuelLeft * fuelPerLap).toFixed(1)}`;
    }
}