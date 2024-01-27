import HudElement, {Hide} from "./HudElement.js";
import {NA, valueIsValid} from "../consts.js";

export default class CompletedLaps extends HudElement {
    override inputKeys: string[] = ['completedLaps'];

    protected override render(completedLaps: number): string | Hide {
        if (!valueIsValid(completedLaps))
            return this.hide(NA);

        return `${completedLaps}`;
    }
}