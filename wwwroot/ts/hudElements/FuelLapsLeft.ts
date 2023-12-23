import HudElement from "./HudElement.js";
import {NA, lerpRGB, valueIsValid} from "../consts.js";
import {EEngineType, IDriverInfo} from '../r3eTypes.js';

export default class FuelLapsLeft extends HudElement {
    override inputKeys: string[] = ['vehicleInfo', 'fuelLeft', 'batterySoC', '+fuelPerLap'];

    protected override render(vehicleInfo: IDriverInfo, fuelLeft: number, battery: number, fuelPerLap: number): string {
        if (vehicleInfo.engineType === EEngineType.Electric) {
            fuelLeft = battery;
        }
        if (!valueIsValid(fuelLeft) || !valueIsValid(fuelPerLap) || fuelPerLap === 0) {
            this.root.style.setProperty('--fuel-left-color', 'rgb(0, 255, 0)')
            return NA;
        }

        // 1 lap left - red, 5 laps left - green
        this.root.style.setProperty('--fuel-left-color', lerpRGB([255, 0, 0], [0, 255, 0], (fuelLeft / fuelPerLap - 1) / 4));
        return `${(fuelLeft / fuelPerLap).toFixed(1)}`;
    }
}