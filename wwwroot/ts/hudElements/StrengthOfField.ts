import HudElement from "./HudElement.js";
import {IDriverData} from "../r3eTypes.js";
import {NA} from "../consts.js";

export default class StrengthOfField extends HudElement {
    override inputKeys: string[] = ['driverData'];

    protected override render(drivers: IDriverData[]): string {
        let rankings = drivers.map(driver => this.hud.rankedDataService.getRankedDataForDriver(driver));

        if (rankings.some(r => r === null))
            return NA;

        rankings = rankings.filter(r => r != null);

        return (rankings.reduce((acc, val) => acc + val.Rating, 0) / rankings.length).toFixed(0);
    }
}