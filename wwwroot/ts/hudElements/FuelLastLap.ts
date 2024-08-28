import HudElement from "./HudElement.js";
import {NA, valuesAreValid, lerpRGB} from "../consts.js";

export default class FuelLastLap extends HudElement {
    override sharedMemoryKeys: string[] = ['+fuelLastLap', '+fuelPerLap'];

    protected override render(fuelLastLap: number, fuelPerLap: number): string {
        if (!valuesAreValid(fuelLastLap, fuelPerLap)) {
            this.root.style.setProperty('--fuel-last-lap-color', 'var(--fuel-middle-color)');
            return NA;
        }

        // last lap consumed more than average - red, less - green, average - middle point
        this.root.style.setProperty('--fuel-last-lap-color', lerpRGB([255, 0, 0], [0, 255, 0], (fuelPerLap - fuelLastLap) * 2.5 + 0.5));
        return `${fuelLastLap.toFixed(2)}`;;
    }
}