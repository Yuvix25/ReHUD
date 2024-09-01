import HudElement, {Style} from "./HudElement.js";
import {laptimeFormat, valueIsValidAssertUndefined} from "../consts.js";
import {Driver} from '../utils.js';
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class CurrentLaptime extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['lapTimeCurrentSelf'];

    protected override render(laptime: number): Style {
        if (!valueIsValidAssertUndefined(laptime)) {
            const currentTime = Driver.mainDriver?.getCurrentTime();
            return this.style(laptimeFormat(currentTime, true), {
                color: 'red',
            });
        }
        return this.style(laptimeFormat(laptime, true), {
            color: 'white',
        });
    }
}
