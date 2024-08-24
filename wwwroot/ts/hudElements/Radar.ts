import {Hide, HudElementWithHideDelay} from "./HudElement.js";
import SettingsValue from "../SettingsValue.js";
import {RADAR_RANGE, RADAR_BEEP_MIN_SPEED, RADAR_LOW_DETAIL, RADAR_OPACITY, RADAR_FADE_RANGE, RADAR_POINTER} from "../consts.js";
import {IDriverData, IPlayerData, IVector3} from "../r3eTypes.js";
import {distanceFromZero, getRadarPointerRotation, mpsToKph, rotateVector, rotationMatrixFromEular, vectorSubtract,} from "../utils.js";


interface IExtendedDriverData extends IDriverData {
    relativePosition: IVector3;
    relativeOrientation: IVector3;
}

export default class Radar extends HudElementWithHideDelay {
    override sharedMemoryKeys: string[] = ['driverData', 'player', 'position', 'carSpeed'];

    protected override render(drivers: IExtendedDriverData[], driver: IPlayerData, myPlace: number, speed: number, radarId: string): Hide | null {
        if (driver == undefined) {
            return this.hide();
        }

        const radar = document.getElementById(radarId);

        const radarLowDetail = SettingsValue.get(RADAR_LOW_DETAIL);
        const radarPointerToggle = SettingsValue.get(RADAR_POINTER);

        speed = mpsToKph(speed);

        const radar_size = radar.offsetWidth;

        const rotationMatrix = rotationMatrixFromEular(driver.orientation);

        const radarRange = SettingsValue.get(RADAR_RANGE);
        const pointerStartRange = radarRange * 1.1;

        const radarOpacity = SettingsValue.get(RADAR_OPACITY);
        const radarFadeRange = radarRange + SettingsValue.get(RADAR_FADE_RANGE);

        let backgroundImage = !radarLowDetail ? 'radial-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4) ),url("/icons/radar-grid.png")' : '';
        radar.style.backgroundImage = backgroundImage;

        drivers.forEach(d => {
            if (myPlace != d.place) {
                d.relativePosition = rotateVector(rotationMatrix, vectorSubtract(driver.position, d.position)); // x - left/right, z - front/back
                d.relativeOrientation = vectorSubtract(d.orientation, driver.orientation);
            } else {
                d.relativePosition = {x: 0, y: 0, z: 0};
                d.relativeOrientation = {x: 0, y: 0, z: 0};
            }
        });
        const close = drivers.filter(d => distanceFromZero(d.relativePosition) < radarFadeRange);

        let closeLeft = 0;
        let closeRight = 0;
        let closest = null;
        for (let i = 0; i < radar.children.length + close.length; i++) {
            if (i >= close.length) {
                if (i < radar.children.length) { // @ts-ignore
                    radar.children[i].style.display = 'none';
                }
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

            const distance = distanceFromZero(driver.relativePosition);

            if (distance < radarRange) {
                if (leftRight < 0 && (Math.abs(frontBack) < Math.abs(leftRight) || Math.abs(frontBack) <= car_length)) {
                    closeLeft = 1;
                } else if (leftRight > 0 && (Math.abs(frontBack) < Math.abs(leftRight) || Math.abs(frontBack) <= car_length)) {
                    closeRight = 1;
                }
            }

            frontBack = -frontBack;

            const width = car_width / radarRange * radar_size / 2;
            const height = car_length / radarRange * radar_size / 2;

            if (radarPointerToggle && distance > pointerStartRange) {
                const pointerRotation = getRadarPointerRotation(distance, driver.relativePosition.x, driver.relativePosition.z);
                const pointerOpacity = Math.pow((distance - radarFadeRange) / (radarRange - radarFadeRange), 1/2); // fade slower at the beginning

                child.style.backgroundColor = 'red';
                child.style.borderRadius = '0px';
                child.style.left = '50%';
                child.style.top = '50%';
                child.style.width = `${width}px`;
                child.style.height = '20px';
                child.style.translate = '-50% -50%';
                child.style.transform = `rotate(${pointerRotation}rad)translate(0px , ${driver.relativePosition.z > 0 ? '-150px' : '150px'})`;
                child.style.opacity = `${pointerOpacity}`;
            } else {
                child.style.backgroundColor = myPlace == driver.place ? 'white' : 'red';
                child.style.borderRadius = '6px';
                child.style.left = `${(leftRight / radarRange) * radar_size / 2 + radar_size / 2 - width / 2}px`;
                child.style.top = `${(frontBack / radarRange) * radar_size / 2 + radar_size / 2 - height / 2}px`;
                child.style.width = `${width}px`;
                child.style.height = `${height}px`;
                child.style.translate = 'none'
                child.style.transform = `rotate(${rotation}rad)`;
                child.style.opacity = '1';
            }

            if (myPlace == driver.place) {
                child.classList.add('radar-car-self');
            } else {
                if (closest == null || distance < closest) {
                    closest = distance;
                }
                child.classList.remove('radar-car-self');
            }
        }
        if (!radarLowDetail) {
            if (closeLeft === 1) {
                backgroundImage += ',url("/icons/radar-grid-warning-left.png")';
            }
            if (closeRight === 1) {
                backgroundImage += ',url("/icons/radar-grid-warning-right.png")';
            }

            radar.style.backgroundImage = backgroundImage;
        }
        if ((closeLeft === 1 || closeRight === 1) && speed >= RADAR_BEEP_MIN_SPEED && this.hud.radarAudioController != null) {
            this.hud.radarAudioController.play(1 - closest / radarRange, closeLeft * -1 + closeRight * 1);
        }

        if (closest === null || closest > radarFadeRange) {
            return this.hide();
        }

        radar.style.opacity = closest < radarRange ? radarOpacity : ((closest - radarFadeRange) / (radarRange - radarFadeRange)) * radarOpacity;
        return null;
    }
}