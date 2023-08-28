import HudElement, {Hide, Style} from "../HudElement.js";
import {valueIsValid} from "../consts.js";
import IShared, {IDriverData} from "../r3eTypes.js";
import {DeltaManager, getUid} from "../utils.js";

export default class Delta extends HudElement {
    override inputKeys: string[] = ['timeDeltaBestSelf', 'currentLapValid'];

    protected override onNewLap(_data: IShared, driver: IDriverData, isMainDriver: boolean): void {
        if (isMainDriver)
            DeltaManager.clear();
    }

    protected override render(timeDeltaBestSelf: number, currentLapValid: number, elementId: string): Hide | Style {
        if (timeDeltaBestSelf == null || timeDeltaBestSelf == -1000 || !valueIsValid(currentLapValid) || currentLapValid === 0) {
            DeltaManager.clear();
            return this.hide('0.000');
        }

        DeltaManager.addDelta(timeDeltaBestSelf);
        const delta = DeltaManager.getDeltaOfDeltas();

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