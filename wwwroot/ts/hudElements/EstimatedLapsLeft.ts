import HudElement, {Hide} from "./HudElement.js";
import {valueIsValid, NA, finished} from "../consts.js";
import {EFinishStatus, ESession} from "../r3eTypes.js";

export default class EstimatedLapsLeft extends HudElement {
    override inputKeys: string[] = ['sessionType', 'finishStatus', 'completedLaps', 'lapDistanceFraction', '+estimatedRaceLapCount'];

    protected override render(sessionType: ESession, finishStatus: EFinishStatus, completedLaps: number, fraction: number, totalLaps: number): string | Hide {
        if (sessionType !== ESession.Race || !valueIsValid(totalLaps) || finished(finishStatus))
            return this.hide(NA);

        if (!valueIsValid(completedLaps)) {
            completedLaps = -1;
            totalLaps--; // in the backend, completedLaps is 0 before the start, so you get an extra lap calculated (the one you'll "complete" when crossing the start line)
        }
        if (!valueIsValid(fraction))
            fraction = 0;

        completedLaps += fraction;
        completedLaps = Math.max(completedLaps, 0);

        return `${(totalLaps - completedLaps).toFixed(1)}/${totalLaps}`;
    }
}