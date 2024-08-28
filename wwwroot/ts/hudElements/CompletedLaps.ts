import HudElement, {Hide} from "./HudElement.js";
import {NA, valueIsValidAssertUndefined} from "../consts.js";

export default class CompletedLaps extends HudElement {
    override sharedMemoryKeys: string[] = ['completedLaps'];

    protected override render(completedLaps: number): string | Hide {
        if (!valueIsValidAssertUndefined(completedLaps))
            return this.hide(NA);

        return `${completedLaps}`;
    }
}