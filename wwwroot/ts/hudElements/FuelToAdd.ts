import HudElement from "./HudElement.js";
import {NA, valuesAreValid, lerpRGB} from "../consts.js";
import {EEngineType, IDriverInfo} from '../r3eTypes.js';
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class FuelToAdd extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['+lapsUntilFinish', 'vehicleInfo', 'fuelLeft', 'batterySoC', '+fuelPerLap'];

    protected override render(lapsUntilFinish: number, vehicleInfo: IDriverInfo, fuelLeft: number, battery: number, fuelPerLap: number): string {
        if (vehicleInfo.engineType === EEngineType.Electric) {
            fuelLeft = battery;
        }
        if (!valuesAreValid(lapsUntilFinish, fuelLeft, fuelPerLap)) {
            this.root.style.setProperty('--fuel-to-add-color', 'var(--fuel-middle-color)');
            return NA;
        }

        const fuelToAdd = lapsUntilFinish * fuelPerLap - fuelLeft;
        this.root.style.setProperty('--fuel-to-add-color', lerpRGB([0, 255, 0], [255, 0, 0], (fuelToAdd + 0.7) * 1.43));
        return `${fuelToAdd.toFixed(1)}`;
    }
}