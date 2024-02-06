import HudElement, {Hide, Style} from "./HudElement.js";
import {DELTA_MODE, SHOW_DELTA_ON_INVALID_LAPS, valueIsValidAssertNull} from "../consts.js";
import IShared, {IDriverData} from "../r3eTypes.js";
import {DeltaManager, Driver} from "../utils.js";
import SettingsValue from "../SettingsValue.js";

export default class Delta extends HudElement {
    override sharedMemoryKeys: string[] = ['timeDeltaBestSelf', 'lapTimeCurrentSelf', 'currentLapValid', 'lapDistance'];

    protected override onNewLap(_data: IShared, driver: IDriverData, isMainDriver: boolean): void {
        if (isMainDriver)
            DeltaManager.clear();
    }

    protected override render(timeDeltaBestSelf: number, lapTimeCurrentSelf: number, currentLapValid: number, lapDistance: number, elementId: string): Hide | Style {
        let usingAlltime = false;
        switch (SettingsValue.get(DELTA_MODE)) {
            case 'session':
            case 'session-fallback-alltime':
                if ((timeDeltaBestSelf == null || timeDeltaBestSelf == -1000) && (SettingsValue.get(SHOW_DELTA_ON_INVALID_LAPS) || currentLapValid) && Driver.mainDriver?.sessionBestLap != null) {
                    timeDeltaBestSelf = Driver.mainDriver.getDeltaToLap(Driver.mainDriver.sessionBestLap, lapDistance, lapTimeCurrentSelf);
                }
                
                if (SettingsValue.get(DELTA_MODE) !== 'session-fallback-alltime' || (timeDeltaBestSelf != null && timeDeltaBestSelf != -1000)) break;
            case 'alltime':
                if (Driver.mainDriver?.bestLap != null && Driver.mainDriver.bestLapTimeValid && (Driver.mainDriver.bestLapTime != Driver.mainDriver.sessionBestLapTime || timeDeltaBestSelf == -1000 || timeDeltaBestSelf == null)) {
                    timeDeltaBestSelf = Driver.mainDriver.getDeltaToLap(Driver.mainDriver.bestLap, lapDistance, lapTimeCurrentSelf);
                    usingAlltime = true;
                }
                break;
        }

        if (Driver.mainDriver != null && Driver.mainDriver.crossedFinishLine == null) {
            currentLapValid = 0;
        } else if (SettingsValue.get(SHOW_DELTA_ON_INVALID_LAPS)) {
            currentLapValid = 1;
        }

        if (timeDeltaBestSelf == null || timeDeltaBestSelf == -1000 || !valueIsValidAssertNull(currentLapValid) || currentLapValid === 0) {
            DeltaManager.clear();
            return this.hide('0.000');
        }

        DeltaManager.addDelta(timeDeltaBestSelf);
        const delta = DeltaManager.getDeltaOfDeltas(usingAlltime ? 0.5 : null); // much more fluctuation for alltime deltas, smaller multiplier to compensate

        const parent = document.getElementById(elementId).parentElement;
        const deltaText = parent?.children?.[0];
        const deltaBar = parent?.children?.[1]?.children?.[0];

        if (parent == null || deltaText == null || deltaBar == null)
            return this.hide('0.000');

        let deltaTextColor;
        if (timeDeltaBestSelf > 0)
            deltaTextColor = 'var(--delta-positive)';
        else if (timeDeltaBestSelf < 0)
            deltaTextColor = 'var(--delta-negative)';
        else
            deltaTextColor = 'var(--delta-neutral)';

        timeDeltaBestSelf = Math.max(Math.min(99.999, timeDeltaBestSelf), -99.999);
        const deltaNumber = timeDeltaBestSelf > 0 ? `+${timeDeltaBestSelf.toFixed(3)}` : timeDeltaBestSelf.toFixed(3);


        const deltaWidth = Math.min(100, Math.abs(delta) * 100) / 2;

        if (!(deltaBar instanceof HTMLElement))
            return this.hide('0.000');

        deltaBar.style.width = `${deltaWidth}%`;
        if (delta > 0)
            deltaBar.style.left = `${50 - deltaWidth}%`;
        else
            deltaBar.style.left = `50%`;

        if (delta > 0)
            deltaBar.style.backgroundColor = 'var(--delta-positive)';
        else if (delta < 0)
            deltaBar.style.backgroundColor = 'var(--delta-negative)';
        else
            deltaBar.style.backgroundColor = 'var(--delta-neutral)';


        return this.style(deltaNumber, {color: deltaTextColor});
    }
}