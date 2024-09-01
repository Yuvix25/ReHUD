import HudElement, {Hide, Style} from "./HudElement.js";
import {valueIsValidAssertUndefined, NA, INC_POINTS_RED_THRESHOLD} from "../consts.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class IncidentPoints extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['incidentPoints', 'maxIncidentPoints'];

    protected override render(incidentPoints: number, maxIncidentPoints: number): string | Style | null | Hide {
        if (maxIncidentPoints === 0)
            maxIncidentPoints = -1;
        if (!valueIsValidAssertUndefined(incidentPoints))
            return this.hide(NA);

        let res = incidentPoints.toString();
        if (valueIsValidAssertUndefined(maxIncidentPoints)) {
            res += `/${maxIncidentPoints}`;
        }
        return this.style(res, {color: (valueIsValidAssertUndefined(maxIncidentPoints) && maxIncidentPoints - incidentPoints < INC_POINTS_RED_THRESHOLD) ? 'red' : 'white'});
    }
}