import HudElement, {Hide} from "./HudElement.js";
import {NA, valueIsValidAssertUndefined} from "../consts.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class CompletedLaps extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['completedLaps'];

    protected override render(completedLaps: number): string | Hide {
        if (!valueIsValidAssertUndefined(completedLaps))
            return this.hide(NA);

        return `${completedLaps}`;
    }
}