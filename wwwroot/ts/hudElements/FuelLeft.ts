import HudElement from "./HudElement.js";
import {valueIsValidAssertUndefined, NA} from "../consts.js";
import {EEngineType, IDriverInfo} from '../r3eTypes.js';
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class FuelLeft extends HudElement {
  override sharedMemoryKeys: SharedMemoryKey[] = ['vehicleInfo', 'fuelLeft', 'batterySoC'];

  protected override render(vehicleInfo: IDriverInfo, fuelLeft: number, battery: number): string {
    if (vehicleInfo.engineType === EEngineType.Electric) {
        fuelLeft = battery;
    }
    return valueIsValidAssertUndefined(fuelLeft) ? `${fuelLeft.toFixed(1)}` : NA;
  }
}