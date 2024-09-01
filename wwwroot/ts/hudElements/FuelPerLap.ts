import HudElement from "./HudElement.js";
import {valueIsValidAssertUndefined, NA} from "../consts.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class FuelPerLap extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['+fuelPerLap'];

    protected override render(fuelPerLap: number): string {
        return valueIsValidAssertUndefined(fuelPerLap) ? `${fuelPerLap.toFixed(2)}` : NA;
    }
}