import HudElement, {Hide} from "./HudElement.js";
import {IExtendedShared, LAST_LAP_SECTORS_TIME_ON_SCREEN, laptimeFormat, mapSectorTimes, valueIsValidAssertUndefined} from "../consts.js";
import IShared, {IDriverData, ISectorStarts, ISectors} from "../r3eTypes.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class SectorTimes extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['sectorTimesSessionBestLap', 'sectorTimesBestSelf', 'sectorTimesCurrentSelf', 'sectorTimesPreviousSelf', 'lapDistanceFraction', 'sectorStartFactors'];

    private lastCompletedLapTimestamp: number = null;

    protected override onNewLap(_data: IExtendedShared, _driver: IDriverData, isMainDriver: boolean): void {
        if (isMainDriver) {
            this.lastCompletedLapTimestamp = Date.now() / 1000;
        }
    }

    protected override render(sessionBest_: ISectors, selfBest_: ISectors, selfCurrent_: ISectors, selfPrevious_: ISectors, lapDistance: number, sectorPositions: ISectorStarts, elementId: string): Hide | null {
        const sessionBest = mapSectorTimes(sessionBest_);
        const selfBest = mapSectorTimes(selfBest_);
        let selfCurrent = mapSectorTimes(selfCurrent_);
        const selfPrevious = mapSectorTimes(selfPrevious_);

        const sectorElements = document.getElementById(elementId).children;

        const now = Date.now() / 1000;

        if (valueIsValidAssertUndefined(lapDistance) && valueIsValidAssertUndefined(sectorPositions?.sector2) && lapDistance < sectorPositions.sector2) {
            selfCurrent = null;
        }

        if (selfCurrent == null && selfPrevious != null && selfPrevious.every(valueIsValidAssertUndefined) && now - this.lastCompletedLapTimestamp <= LAST_LAP_SECTORS_TIME_ON_SCREEN) {
            selfCurrent = selfPrevious;
        } else if (selfPrevious != null && selfCurrent != null && selfPrevious[0] === selfCurrent[0] && selfPrevious[1] === selfCurrent[1] && selfPrevious[2] === selfCurrent[2]) {
            selfCurrent = null; // RaceRoom doesn't clean up current after a new lap, only when the 1st sector is completed
        }

        if (selfCurrent == null || !selfCurrent.some(valueIsValidAssertUndefined)) {
            for (const sectorElement of sectorElements) {
                if (!(sectorElement instanceof HTMLElement))
                    continue;

                sectorElement.style.display = null;
                sectorElement.innerText = '';
                sectorElement.style.backgroundColor = 'var(--time-gray)';
            }
            return this.hide();
        }

        let foundNull = false;
        for (let i = 0; i < sectorElements.length; i++) {
            const sectorElement = sectorElements[i];
            if (!(sectorElement instanceof HTMLElement))
                continue;

            const sectorTime = selfCurrent[i];
            const sectorTimeBestSelf = selfBest[i];
            const sectorTimeSessionBest = sessionBest[i];

            if (!valueIsValidAssertUndefined(sectorTime) || foundNull) {
                sectorElement.style.display = 'none';
                foundNull = true;
            } else {
                sectorElement.style.display = null;

                let color;
                if (!valueIsValidAssertUndefined(sectorTimeSessionBest) || sectorTime <= sectorTimeSessionBest)
                    color = 'var(--time-purple)';
                else if (!valueIsValidAssertUndefined(sectorTimeBestSelf) || sectorTime <= sectorTimeBestSelf)
                    color = 'var(--time-green)';
                else
                    color = 'var(--time-gray)';

                sectorElement.innerText = laptimeFormat(sectorTime, true);
                sectorElement.style.backgroundColor = color;
            }
        }

        return null;
    }
}