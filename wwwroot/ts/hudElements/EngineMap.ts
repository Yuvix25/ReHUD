import HudElement from "./HudElement.js";
import {valueIsValid} from "../consts.js";

export default class EngineMap extends HudElement {
    override inputKeys: string[] = ['engineMapSetting'];

    protected override render(em: number): string {
        return `EM: ${valueIsValid(em) ? em : 5}`;
    }
}