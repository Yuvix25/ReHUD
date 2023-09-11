import HudElement, {Hide} from "./HudElement.js";
import {ICarDamage} from "../r3eTypes.js";

export default class Damage extends HudElement {
    override inputKeys: string[] = ['carDamage'];

    protected override render(damage: ICarDamage): Hide | null {
        const parts = ['engine', 'transmission', 'suspension', 'aerodynamics'] as const;
        for (const part of parts) {
            const element: HTMLInputElement = document.querySelector(`#${part}-damage progress`);
            let value = damage[part];
            if (value == null)
                value = 0;

            if (value == -1)
                return this.hide();

            element.value = (value === 0 ? 1 : value).toString();
            this.root.style.setProperty(`--${part}-damage-color`, value == 0 ? 'var(--damage-color-full)' : value == 1 ? 'var(--damage-color-ok)' : 'var(--damage-color-partial)');
        }

        return null;
    }
}