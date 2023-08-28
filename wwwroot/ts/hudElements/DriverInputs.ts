import HudElement from "../HudElement.js";
import {valueIsValid} from "../consts.js";

export default class DriverInputs extends HudElement {
    override inputKeys: string[] = ['throttleRaw', 'brakeRaw', 'clutchRaw', 'steerInputRaw', 'steerWheelRangeDegrees'];

    protected override render(tRaw: number, bRaw: number, cRaw: number, sRaw: number, sRange: number): null {
        const throttle = document.getElementById('throttle-input');
        const brake = document.getElementById('brake-input');
        const clutch = document.getElementById('clutch-input');
        const throttleProgress: HTMLInputElement = document.querySelector('#throttle-progress');
        const brakeProgress: HTMLInputElement = document.querySelector('#brake-progress');
        const clutchProgress: HTMLInputElement = document.querySelector('#clutch-progress');

        const steer = document.getElementById('steering-wheel');

        tRaw = valueIsValid(tRaw) ? tRaw : 0;
        bRaw = valueIsValid(bRaw) ? bRaw : 0;
        cRaw = valueIsValid(cRaw) ? cRaw : 0;
        sRaw = sRaw != undefined ? sRaw : 0;
        sRange = valueIsValid(sRange) ? sRange : 360;

        throttle.innerText = `${Math.round(tRaw * 100)}`;
        brake.innerText = `${Math.round(bRaw * 100)}`;
        clutch.innerText = `${Math.round(cRaw * 100)}`;

        throttleProgress.value = tRaw.toString();
        brakeProgress.value = bRaw.toString();
        clutchProgress.value = cRaw.toString();

        const steerAngle = sRaw * sRange / 2;
        steer.style.transform = `rotate(${steerAngle}deg)`;

        return null;
    }
}