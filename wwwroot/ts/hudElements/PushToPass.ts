import HudElement, {Hide} from "./HudElement.js";
import {valueIsValid, NA} from "../consts.js";
import IShared, {IPushToPass} from "../r3eTypes.js";
let p2pActiveTimeTotal = -1;
let p2pWaitTimeTotal = -1;

export default class Rake extends HudElement {

    override inputKeys: string[] = ['pushToPass'];

    protected override onPushToPassActivation(data: IShared, pushToPass: IPushToPass): void {
        p2pActiveTimeTotal = data.pushToPass.engagedTimeLeft;
    }
    protected override onPushToPassDeactivation(data: IShared, pushToPass: IPushToPass): void {
        p2pWaitTimeTotal = data.pushToPass.waitTimeLeft;
    }
    protected override onPushToPassReady(data: IShared): void {
        this.hud.p2pAudioController.play(1, 0);
    }

    protected override render(p2p: IPushToPass): string | Hide {
        if(!valueIsValid(p2p.available))
            return this.hide(`P2P left: ${NA}`);
        const p2pLeft = p2p.amountLeft;
        const p2pEngagedTime = p2p.engagedTimeLeft;
        const p2pActiveTimeLeft = p2p.engagedTimeLeft;
        const p2pWaitTimeLeft = p2p.waitTimeLeft;
        const p2pText = document.getElementById('p2p-text');
        const p2pBar = document.getElementById('p2p-bar')
        const p2pWaitTimePercent = p2pWaitTimeLeft > 0 ? p2pWaitTimeLeft / p2pWaitTimeTotal : -1;
        const p2pActiveTimePercent = p2pActiveTimeLeft > 0 ? p2pActiveTimeLeft / p2pActiveTimeTotal : -1;

        if(p2pWaitTimeLeft > 0 && p2pLeft > 0) {
            p2pText.textContent = `${p2pWaitTimeLeft.toFixed(1)}s`;
            p2pBar.style.left = '';
            p2pBar.style.right = '0%';
            p2pBar.style.width = `calc(${p2pWaitTimePercent * 100}% - 1px)`;
            p2pBar.style.backgroundColor = 'red';
        } else if(p2pEngagedTime > 0) {
            p2pText.textContent = `${p2pEngagedTime.toFixed(1)}s`;
            p2pBar.style.right = '';
            p2pBar.style.left = '1px';
            p2pBar.style.width = `calc(${p2pActiveTimePercent * 100}% - 1px)`;
            p2pBar.style.backgroundColor = 'blue';
            } else if(p2pLeft > 0) {
                p2pText.textContent = 'READY';
                p2pBar.style.left = '1px';
                p2pBar.style.width = 'calc(100% - 1px)';
                p2pBar.style.backgroundColor = 'green';
                } else {
                    p2pText.textContent = '';
                    p2pBar.style.width = '0%';
                    }
        
        return `P2P left: ${valueIsValid(p2pLeft) ? p2pLeft.toFixed(0) : NA}`;
    }
}