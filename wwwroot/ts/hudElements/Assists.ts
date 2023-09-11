import HudElement from "./HudElement.js";
import {valueIsValid} from "../consts.js";
import {IAidSettings} from "../r3eTypes.js";

export default class Assists extends HudElement {
    override inputKeys: string[] = ['aidSettings'];

    protected override render(assists: IAidSettings): null {
        let tc = assists.tc;
        let abs = assists.abs;

        tc = valueIsValid(tc) ? tc : 0;
        abs = valueIsValid(abs) ? abs : 0;

        if (tc == 0)
            document.getElementById('tc-icon').style.display = 'none';
        else
            document.getElementById('tc-icon').style.display = 'block';

        if (abs == 0)
            document.getElementById('abs-icon').style.display = 'none';
        else
            document.getElementById('abs-icon').style.display = 'block';

        this.root.style.setProperty('--tc-grayscale', (tc == 5 ? 0 : 1).toString());
        this.root.style.setProperty('--abs-grayscale', (abs == 5 ? 0 : 1).toString());
        this.root.style.setProperty('--tc-brightness', (tc == 0 ? 1 : 10).toString());
        this.root.style.setProperty('--abs-brightness', (abs == 0 ? 1 : 10).toString());

        return null;
    }
}