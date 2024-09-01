import HudElement from "./HudElement.js";
import {valueIsValidAssertUndefined, NA} from "../consts.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class EngineBraking extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['engineBrakeSetting'];

    protected override render(eb: number): string {
        return `EB: ${valueIsValidAssertUndefined(eb) ? eb : NA}`
    }
}