import HudElement from "../HudElement.js";
import {NA} from "../consts.js";

export default class FuelToEnd extends HudElement {
    override inputKeys: string[] = ['+lapsUntilFinish', '+fuelPerLap'];

    protected override render(fuelLeft: number, fuelPerLap: number): string {
        if (fuelLeft == undefined || fuelPerLap == undefined)
            return NA;
        return `${(fuelLeft * fuelPerLap).toFixed(1)}`;
    }
}