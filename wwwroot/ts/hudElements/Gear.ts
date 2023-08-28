import HudElement from "../HudElement.js";

export default class Gear extends HudElement {
    override inputKeys: string[] = ['gear'];

    protected override render(gear: number, elementId: string): string {
        const gearElement = document.getElementById(elementId);
        const res = (gear == undefined || gear == 0) ? 'N' : gear == -1 ? 'R' : gear.toString();
        if (res.length == 1)
            gearElement.style.width = '69px';
        else
            gearElement.style.width = '117px';

        return res;
    }
}