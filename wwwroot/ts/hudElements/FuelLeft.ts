import HudElement from "./HudElement.js";
import {valueIsValid, NA} from "../consts.js";
import {EEngineType, IDriverInfo} from '../r3eTypes.js';

export default class FuelLeft extends HudElement {
  override inputKeys: string[] = ['vehicleInfo', 'fuelLeft', 'batterySoC'];

  protected override render(vehicleInfo: IDriverInfo, fuelLeft: number, battery: number): string {
    if (vehicleInfo.engineType === EEngineType.Electric) {
        fuelLeft = battery;
    }
    return valueIsValid(fuelLeft) ? `${fuelLeft.toFixed(1)}` : NA;
  }
}