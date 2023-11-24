import HudElement, {Hide} from "./HudElement.js";
import {valueIsValid} from "../consts.js";

export default class CompletedLaps extends HudElement {
    override inputKeys: string[] = ['completedLaps'];

    protected override render(completedLaps: number): string | Hide {
        if (!valueIsValid(completedLaps))
            return this.hide();

        return `${completedLaps}`;
    }
}