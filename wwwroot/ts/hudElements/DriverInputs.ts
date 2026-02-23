import HudElement from "./HudElement.js";
import {validNumberOrDefault, valueIsValidAssertUndefined} from "../consts.js";
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';
import {InputGraph} from "./InputGraph.js";

export default class DriverInputs extends HudElement {
    override sharedMemoryKeys: SharedMemoryKey[] = ['throttleRaw', 'throttle', 'brakeRaw', 'brake', 'clutchRaw', 'clutch', 'steerInputRaw', 'steerWheelRangeDegrees'];

    private inputGraph: InputGraph | null = null;

    private static rawOrReal(n: number, r: number): number {
        return validNumberOrDefault(n, validNumberOrDefault(r, 0));
    }

    protected override render(tRaw: number, t: number, bRaw: number, b: number, cRaw: number, c: number, sRaw: number, sRange: number): null {
        const throttle = document.getElementById('throttle-input');
        const brake = document.getElementById('brake-input');
        const clutch = document.getElementById('clutch-input');
        const throttleProgress: HTMLInputElement = document.querySelector('#throttle-progress');
        const brakeProgress: HTMLInputElement = document.querySelector('#brake-progress');
        const clutchProgress: HTMLInputElement = document.querySelector('#clutch-progress');

        const steer = document.getElementById('steering-wheel');

        if (!this.inputGraph) {
            const canvas = document.getElementById('input-graph') as HTMLCanvasElement;
            if (canvas) {
                this.inputGraph = new InputGraph(canvas, 100);
            }
        }

        tRaw = DriverInputs.rawOrReal(tRaw, t);
        bRaw = DriverInputs.rawOrReal(bRaw, b);
        cRaw = DriverInputs.rawOrReal(cRaw, c);
        sRaw = sRaw ?? 0;
        sRange = valueIsValidAssertUndefined(sRange) ? sRange : 360;

        throttle.innerText = `${Math.round(tRaw * 100)}`;
        brake.innerText = `${Math.round(bRaw * 100)}`;
        clutch.innerText = `${Math.round(cRaw * 100)}`;

        throttleProgress.value = tRaw.toString();
        brakeProgress.value = bRaw.toString();
        clutchProgress.value = cRaw.toString();

        if (this.inputGraph) {
            this.inputGraph.update(tRaw, bRaw);
        }

        const steerAngle = sRaw * sRange / 2;
        steer.style.transform = `rotate(${steerAngle}deg)`;

        return null;
    }
}