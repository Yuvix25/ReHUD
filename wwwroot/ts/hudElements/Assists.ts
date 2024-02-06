import HudElement from "./HudElement.js";
import {valueIsValidAssertNull} from "../consts.js";
import {IAidSettings} from "../r3eTypes.js";

export default class Assists extends HudElement {
    override sharedMemoryKeys: string[] = ['aidSettings'];

    protected override render(assists: IAidSettings): null {
        const tcElement = document.getElementById('tc-icon');
        const absElement = document.getElementById('abs-icon');

        let tc = assists.tc;
        let abs = assists.abs;

        tc = valueIsValidAssertNull(tc) ? tc : 0;
        abs = valueIsValidAssertNull(abs) ? abs : 0;

        if (tc == 0 && abs == 0) {
            tcElement.style.display = 'none';
            absElement.style.display = 'none';
        } else {
            tcElement.style.display = 'block';
            absElement.style.display = 'block';

            tcElement.style.opacity = (tc == 0 ? 0 : 1).toString();
            absElement.style.opacity = (abs == 0 ? 0 : 1).toString();
        }

        this.root.style.setProperty('--tc-grayscale', (tc == 5 ? 0 : 1).toString());
        this.root.style.setProperty('--abs-grayscale', (abs == 5 ? 0 : 1).toString());
        this.root.style.setProperty('--tc-brightness', (tc == 0 ? 1 : 10).toString());
        this.root.style.setProperty('--abs-brightness', (abs == 0 ? 1 : 10).toString());

        return null;
    }
}