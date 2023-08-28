import HudElement from "../HudElement.js";
import {NA, lerpRGB, valueIsValid} from "../consts.js";

export default class FuelLapsLeft extends HudElement {
    override inputKeys: string[] = ['fuelLeft', '+fuelPerLap'];

    protected override render(fuelLeft: number, fuelPerLap: number): string {
        if (!valueIsValid(fuelLeft) || !valueIsValid(fuelPerLap)) {
            this.root.style.setProperty('--fuel-left-color', 'rgb(0, 255, 0)')
            return NA;
        }

        // 1 lap left - red, 5 laps left - green
        this.root.style.setProperty('--fuel-left-color', lerpRGB([255, 0, 0], [0, 255, 0], (fuelLeft / fuelPerLap - 1) / 4));
        return `${(fuelLeft / fuelPerLap).toFixed(1)}`;
    }
}