import {Hide, HudElementWithHideDelay} from "./HudElement.js";
import SettingsValue from "../SettingsValue.js";
import {RADAR_RANGE, RADAR_BEEP_MIN_SPEED} from "../consts.js";
import {IDriverData, IPlayerData, IVector3} from "../r3eTypes.js";
import {distanceFromZero, mpsToKph, rotateVector, rotationMatrixFromEular, vectorSubtract} from "../utils.js";


interface IExtendedDriverData extends IDriverData {
    relativePosition: IVector3;
    relativeOrientation: IVector3;
}

export default class Radar extends HudElementWithHideDelay {
    override inputKeys: string[] = ['driverData', 'player', 'position', 'carSpeed'];

    protected override render(drivers: IExtendedDriverData[], driver: IPlayerData, myPlace: number, speed: number, radarId: string): Hide | null {
        const radar = document.getElementById(radarId);

        let backgroundImage = 'radial-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4) ),url("/icons/radar-grid.png")';
        radar.style.backgroundImage = backgroundImage;

        if (driver == undefined)
            return this.hide();


        speed = mpsToKph(speed);

        const radar_size = radar.offsetWidth;

        const rotationMatrix = rotationMatrixFromEular(driver.orientation);

        const radarRange = SettingsValue.get(RADAR_RANGE);

        drivers.forEach(d => {
            if (myPlace != d.place) {
                d.relativePosition = rotateVector(rotationMatrix, vectorSubtract(driver.position, d.position)); // x - left/right, z - front/back
                d.relativeOrientation = vectorSubtract(d.orientation, driver.orientation);
            } else {
                d.relativePosition = {x: 0, y: 0, z: 0};
                d.relativeOrientation = {x: 0, y: 0, z: 0};
            }
        });
        const close = drivers.filter(d => distanceFromZero(d.relativePosition) < radarRange + 4);

        let closeLeft = 0;
        let closeRight = 0;
        let closest = null;
        for (let i = 0; i < radar.children.length + close.length; i++) {
            if (i >= close.length) {
                if (i < radar.children.length) // @ts-ignore
                    radar.children[i].style.display = 'none';
                continue;
            } else if (i >= radar.children.length) {
                const newElement = document.createElement('div');
                newElement.className = 'radar-car';
                radar.appendChild(newElement);
            }
            let child = radar.children[i];
            if (!(child instanceof HTMLElement)) {
                continue;
            }

            child.style.display = null;
            const driver = close[i];

            const rotation = driver.relativeOrientation.y;
            const leftRight = driver.relativePosition.x;
            let frontBack = driver.relativePosition.z;

            const car_width = driver.driverInfo.carWidth;
            const car_length = driver.driverInfo.carLength;

            if (leftRight < 0 && (Math.abs(frontBack) < Math.abs(leftRight) || Math.abs(frontBack) <= car_length))
                closeLeft = 1;
            else if (leftRight > 0 && (Math.abs(frontBack) < Math.abs(leftRight) || Math.abs(frontBack) <= car_length))
                closeRight = 1;

            frontBack = -frontBack;

            const distance = distanceFromZero(driver.relativePosition);

            const width = car_width / radarRange * radar_size / 2;
            const height = car_length / radarRange * radar_size / 2;

            child.style.left = `${(leftRight / radarRange) * radar_size / 2 + radar_size / 2 - width / 2}px`;
            child.style.top = `${(frontBack / radarRange) * radar_size / 2 + radar_size / 2 - height / 2}px`;
            child.style.width = `${width}px`;
            child.style.height = `${height}px`;
            child.style.transform = `rotate(${rotation}rad)`;

            if (myPlace == driver.place) {
                child.classList.add('radar-car-self');
            } else {
                if (closest == null || distance < closest)
                    closest = distance;
                child.classList.remove('radar-car-self');
            }
        }

        if (closeLeft === 1)
            backgroundImage += ',url("/icons/radar-grid-warning-left.png")';
        if (closeRight === 1)
            backgroundImage += ',url("/icons/radar-grid-warning-right.png")';

        radar.style.backgroundImage = backgroundImage;

        if ((closeLeft === 1 || closeRight === 1) && speed >= RADAR_BEEP_MIN_SPEED && this.hud.radarAudioController != null)
            this.hud.radarAudioController.play(1 - closest / radarRange, closeLeft * -1 + closeRight * 1);

        if (closest === null || closest > radarRange)
            return this.hide();

        return null;
    }
}