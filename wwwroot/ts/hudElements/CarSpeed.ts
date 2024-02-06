import HudElement from "./HudElement.js";
import SettingsValue from "../SettingsValue.js";
import {convertSpeed, SPEED_UNITS} from "../consts.js";

export default class CarSpeed extends HudElement {
    override sharedMemoryKeys: string[] = ['carSpeed'];

    protected override render(speed: number): string {
        return convertSpeed(speed, SettingsValue.get(SPEED_UNITS)).toString();
    }
}