import HudElement from "./HudElement.js";
import {valuesAreValid, timeFormat} from "../consts.js";
import {EEngineType, IDriverInfo} from '../r3eTypes.js';
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class FuelTimeLeft extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['vehicleInfo', 'fuelLeft', 'batterySoC', '+fuelPerLap', '+averageLapTime'];

    protected override render(vehicleInfo: IDriverInfo, fuelLeft: number, battery: number, fuelPerLap: number, averageLapTime: number): string {
        if (vehicleInfo.engineType === EEngineType.Electric) {
            fuelLeft = battery;
        }
        if (!valuesAreValid(fuelLeft, fuelPerLap, averageLapTime)) {
            return timeFormat(null);
        }

        const time = fuelLeft / fuelPerLap * averageLapTime;
        return timeFormat(time);
    }
}