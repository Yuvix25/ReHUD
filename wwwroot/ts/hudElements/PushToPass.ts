import HudElement, {Hide} from "./HudElement.js";
import {valueIsValid, NA, valueIsValidAssertUndefined, IExtendedShared} from "../consts.js";
import IShared, {IPushToPass} from "../r3eTypes.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class Rake extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['pushToPass'];

    private p2pActiveTimeTotal = -1;
    private p2pWaitTimeTotal = -1;

    protected override onPushToPassActivation(data: IExtendedShared, pushToPass: IPushToPass): void {
        this.p2pActiveTimeTotal = data.rawData.pushToPass.engagedTimeLeft;
    }
    protected override onPushToPassDeactivation(data: IExtendedShared, pushToPass: IPushToPass): void {
        this.p2pWaitTimeTotal = data.rawData.pushToPass.waitTimeLeft;
    }
    protected override onPushToPassReady(data: IExtendedShared): void {
        this.hud.p2pAudioController.play(1, 0);
    }

    protected override render(p2p: IPushToPass): string | Hide {
        if (!valueIsValidAssertUndefined(p2p.available)) {
            return this.hide(NA);
        }

        const p2pLeft = p2p.amountLeft;
        const p2pEngagedTime = p2p.engagedTimeLeft;
        const p2pActiveTimeLeft = p2p.engagedTimeLeft;
        const p2pWaitTimeLeft = p2p.waitTimeLeft;
        const p2pText = document.getElementById('p2p-text');
        const p2pBar = document.getElementById('p2p-bar')
        const p2pWaitTimePercent = p2pWaitTimeLeft > 0 ? p2pWaitTimeLeft / this.p2pWaitTimeTotal : -1;
        const p2pActiveTimePercent = p2pActiveTimeLeft > 0 ? p2pActiveTimeLeft / this.p2pActiveTimeTotal : -1;

        let width;
        let color;
        if (p2pWaitTimeLeft > 0) {
            p2pText.textContent = `${p2pWaitTimeLeft.toFixed(1)}s`;
            width = `${p2pWaitTimePercent * 100}%`;
            color = 'red';
        } else if (p2pEngagedTime > 0) {
            p2pText.textContent = `${p2pEngagedTime.toFixed(1)}s`;
            width = `${p2pActiveTimePercent * 100}%`;
            color = 'blue';
        } else if (p2pLeft > 0) {
            p2pText.textContent = 'READY';
            p2pBar.style.left = '1px';
            width = '100%';
            color = 'green';
        } else {
            p2pText.textContent = NA;
            width = '100%';
            color = '#333';
        }
        p2pBar.style.backgroundImage = `linear-gradient(to right, ${color} ${width}, transparent ${width})`;

        return valueIsValid(p2pLeft) ? p2pLeft.toFixed(0) : NA;
    }
}