import HudElement, {Hide, Style} from "./HudElement.js";
import {valueIsValid, NA, INC_POINTS_RED_THRESHOLD} from "../consts.js";

export default class IncidentPoints extends HudElement {
    override inputKeys: string[] = ['incidentPoints', 'maxIncidentPoints'];

    protected override render(incidentPoints: number, maxIncidentPoints: number): string | Style | null | Hide {
        if (maxIncidentPoints === 0)
            maxIncidentPoints = -1;
        if (!valueIsValid(incidentPoints))
            return this.hide(NA);

        let res = incidentPoints.toString();
        if (valueIsValid(maxIncidentPoints)) {
            res += `/${maxIncidentPoints}`;
        }
        return this.style(res, {color: (valueIsValid(maxIncidentPoints) && maxIncidentPoints - incidentPoints < INC_POINTS_RED_THRESHOLD) ? 'red' : 'white'});
    }
}