import HudElement from "./HudElement.js";
import {valueIsValidAssertNull} from "../consts.js";

export default class Revs extends HudElement {
    override sharedMemoryKeys: string[] = ['engineRps', 'maxEngineRps', 'upshiftRps', 'pitLimiter'];

    protected override render(current: number, max: number, upshift: number, pitLimiter: number, id: string): null {
        if (!valueIsValidAssertNull(current) || !valueIsValidAssertNull(max))
            return null;

        try {
            // @ts-ignore
            document.getElementById(id).value = current;
        } catch (e) {
            console.error(`Error setting value of '${id}' to ${current} (revs)`, e);
            return null;
        }
        // @ts-ignore
        document.getElementById(id).max = max;

        if (pitLimiter === 1) {
            const time = Date.now();
            current = time % 250 < 125 ? upshift - 0.001 : max;
        }

        if (current < upshift - (max - upshift) * 2.5) {
            this.root.style.setProperty('--revs-color', 'var(--revs-color-normal)');
        } else if (current < upshift) {
            this.root.style.setProperty('--revs-color', 'var(--revs-color-upshift)');
        } else {
            this.root.style.setProperty('--revs-color', 'var(--revs-color-redline)');
        }

        return null;
    }
}