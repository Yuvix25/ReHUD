import HudElement from "../HudElement.js";
import {NA, lerpRGB} from "../consts.js";

export default class FuelToAdd extends HudElement {
    override inputKeys: string[] = ['+lapsUntilFinish', 'fuelLeft', '+fuelPerLap'];

    protected override render(lapsUntilFinish: number, fuelLeft: number, fuelPerLap: number): string {
        if (lapsUntilFinish == undefined || fuelLeft == undefined || fuelPerLap == undefined) {
            this.root.style.setProperty('--fuel-to-add-color', 'var(--fuel-middle-color)');
            return NA;
        }

        const fuelToAdd = lapsUntilFinish * fuelLeft - fuelPerLap;
        this.root.style.setProperty('--fuel-to-add-color', lerpRGB([0, 255, 0], [255, 0, 0], (fuelToAdd + 0.7) * 1.43));
        return `${fuelToAdd.toFixed(1)}`;
    }
}