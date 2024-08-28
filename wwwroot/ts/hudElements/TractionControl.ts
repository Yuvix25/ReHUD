import HudElement, {Hide, Style} from "./HudElement.js";
import {valueIsValidAssertUndefined, NA} from "../consts.js";

export default class TractionControl extends HudElement {
    override sharedMemoryKeys: string[] = ['tractionControlSetting', 'tractionControlPercent'];

    protected override render(tcPreset: number, tcPercent: number): string | Style | Hide {
        if (valueIsValidAssertUndefined(tcPreset) && !valueIsValidAssertUndefined(tcPercent)) {
            return 'TC6';
        }
        if (!valueIsValidAssertUndefined(tcPreset)) {
            return 'TC: ' + NA;
        }
        return `TC${tcPreset}: ${Math.round(tcPercent)}%`;
    }
}