import HudElement from "./HudElement.js";
import {valueIsValidAssertUndefined} from "../consts.js";

export default class EngineMap extends HudElement {
    override sharedMemoryKeys: string[] = ['engineMapSetting'];

    protected override render(em: number): string {
        return `EM: ${valueIsValidAssertUndefined(em) ? em : 5}`;
    }
}