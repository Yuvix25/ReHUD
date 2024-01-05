import HudElement, {Hide} from "./HudElement.js";
import {NA} from "../consts.js";
import {IDrs} from "../r3eTypes.js";

export default class Rake extends HudElement {
    override inputKeys: string[] = ['drs'];

    protected override render(drs: IDrs): string | Hide {
        if(drs.equipped == 0)
            return this.hide(`DRS left: ${NA}`);
        const drsLeft = drs.numActivationsLeft;
        const drsActive = drs.engaged;
        const p2pElement = document.getElementById('drs-symbol');

        if(drsActive > 0) {
            p2pElement.style.backgroundColor = 'blue';
        } else if(drsLeft > 0) {
                p2pElement.style.backgroundColor = 'green';
            }  else {
                p2pElement.style.backgroundColor = ''; }

        return `DRS left: ${drsLeft > 100 ? "∞" : drsLeft}`;
    }
}