import HudElement, {Hide} from "./HudElement.js";
import {NA, valueIsValidAssertNull} from "../consts.js";
import {IDriverData} from "../r3eTypes.js";

export default class Position extends HudElement {
    override sharedMemoryKeys: string[] = ['position', 'positionClass', 'driverData'];

    protected override render(position: number, positionClass: number, drivers: IDriverData[]): string | Hide {
        if (!valueIsValidAssertNull(position))
            return this.hide(NA);

        let myIndex = -1;
        for (let i = 0; i < drivers.length; i++) {
            if (drivers[i].place == position) {
                myIndex = i;
                break;
            }
        }

        let classCount = 0;
        for (const driver of drivers)
            if (driver != null && drivers[myIndex] != null && driver.driverInfo.classPerformanceIndex == drivers[myIndex].driverInfo.classPerformanceIndex)
                classCount++;

        return `${positionClass}/${classCount}`;
    }
}