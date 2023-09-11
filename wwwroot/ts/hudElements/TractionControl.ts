import HudElement, {Hide, Style} from "./HudElement.js";
import {valueIsValid, NA} from "../consts.js";

export default class TractionControl extends HudElement {
    override inputKeys: string[] = ['tractionControlSetting', 'tractionControlPercent'];

    protected override render(tcPreset: number, tcPercent: number): string | Style | Hide {
        if (valueIsValid(tcPreset) && !valueIsValid(tcPercent)) {
            return 'TC6';
        }
        if (!valueIsValid(tcPreset)) {
            return 'TC: ' + NA;
        }
        return `TC${tcPreset}: ${Math.round(tcPercent)}%`;
    }
}