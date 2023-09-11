import HudElement from "./HudElement.js";
import {NA, allValuesAreValid, timeFormat} from "../consts.js";

export default class FuelTimeLeft extends HudElement {
    override inputKeys: string[] = ['fuelLeft', '+fuelPerLap', '+averageLapTime'];

    protected override render(fuelLeft: number, fuelPerLap: number, averageLapTime: number): string {        
        if (!allValuesAreValid(fuelLeft, fuelPerLap, averageLapTime))
            return NA;

        const time = fuelLeft / fuelPerLap * averageLapTime;
        return timeFormat(time);
    }
}