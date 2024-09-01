import HudElement from "./HudElement.js";
import {valueIsValidAssertUndefined} from "../consts.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class EngineMap extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['engineMapSetting'];

    protected override render(em: number): string {
        return `EM: ${valueIsValidAssertUndefined(em) ? em : 5}`;
    }
}