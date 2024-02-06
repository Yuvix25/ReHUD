import HudElement from "./HudElement.js";
import {valueIsValidAssertNull} from "../consts.js";

export default class EngineMap extends HudElement {
    override sharedMemoryKeys: string[] = ['engineMapSetting'];

    protected override render(em: number): string {
        return `EM: ${valueIsValidAssertNull(em) ? em : 5}`;
    }
}