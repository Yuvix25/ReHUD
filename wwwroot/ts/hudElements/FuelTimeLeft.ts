import HudElement from "../HudElement.js";
import {NA, timeFormat} from "../consts.js";

export default class FuelTimeLeft extends HudElement {
    override inputKeys: string[] = ['fuelLeft', '+fuelPerLap', '+averageLapTime'];

    protected override render(fuelLeft: number, fuelPerLap: number, averageLapTime: number): string {        
        if (fuelLeft == undefined || fuelPerLap == undefined || averageLapTime == undefined)
            return NA;

        const time = fuelLeft / fuelPerLap * averageLapTime;
        return timeFormat(time);
    }
}