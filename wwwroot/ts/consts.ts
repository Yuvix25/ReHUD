/* ========================================== Types ========================================== */

import IShared from "./r3eTypes";

export interface IExtendedShared {
    rawData: IShared;
    fuelPerLap: number;
    fuelLastLap: number;
    averageLapTime: number;
    bestLapTime: number;
    estimatedRaceLapCount: number;
    lapsUntilFinish: number;
    forceUpdateAll: boolean;
}


/* ========================================== Constants ========================================== */

// settings
export const CHECK_FOR_UPDATES = "check-for-updates";
export const SPEED_UNITS = "speedUnits";
export const PRESSURE_UNITS = "pressureUnits";
export const RADAR_RANGE = "radarRange";
export const RADAR_BEEP_VOLUME = "radarBeepVolume";
export const HUD_LAYOUT = "hudLayout";


export const DEFAULT_RENDER_CYCLE = 30;
export const ITERATION_CYCLE = 1000;

export const INC_POINTS_RED_THRESHOLD = 4; // will be red if maxIncidents - currentIncidents >= this value

export const DEFAULT_RADAR_RADIUS = 12; // meters
export const RADAR_BEEP_MIN_SPEED = 15; // km/h

export const LAST_LAP_SECTORS_TIME_ON_SCREEN = 6; // seconds


export const ELEMENT_SCALE_POWER = 2;


export const RELATIVE_LENGTH = 8;
export const halfLengthTop = Math.ceil((RELATIVE_LENGTH - 1) / 2);
export const halfLengthBottom = Math.floor((RELATIVE_LENGTH - 1) / 2);

export const MAIN_CONTAINER_MARGIN = 7; // note: this value must match the value from app.css

export const NA = 'N/A';

export const CLASS_COLORS = [
    [255, 51, 51],
    [255, 157, 51],
    [246, 255, 51],
    [140, 255, 51],
    [51, 255, 68],
    [51, 255, 174],
    [51, 230, 255],
    [51, 123, 255],
    [85, 51, 255],
];


export const SESSION_TYPES = {
    [-1]: 'Unknown',
    0: 'Practice',
    1: 'Qualifying',
    2: 'Race',
    3: 'Warmup',
    4: 'Lap',
    5: 'Time Left',
} as const;



export const TRANSFORMABLES = {
    'position-container': 'Position',
    'estimated-laps-left-container': 'Estimated Laps Left',

    'last-lap-session-container': 'Last Laptime',
    'best-lap-session-container': 'Best Laptime',
    'incident-points-container': 'Incident Points',
    'time-left-container': 'Time Left',

    'tires': 'Tires',
    'damage': 'Damage',
    'fuel-data': 'Fuel Data',

    'radar': 'Radar',
    'delta': 'Delta',
    'sector-times': 'Sector Times',

    'relative-viewer': 'Relative',
    'driver-inputs': 'Inputs',
    'basic': 'MoTeC',
} as const;

export type TransformableId = keyof typeof TRANSFORMABLES;


/* ========================================== Functions ========================================== */


export function getSessionType(sessionType: keyof typeof SESSION_TYPES): typeof SESSION_TYPES[keyof typeof SESSION_TYPES] {
    if (valueIsValid(sessionType) && 0 <= sessionType && sessionType <= 4) {
        return SESSION_TYPES[sessionType];
    }
    return SESSION_TYPES[5];
}


export function getRealOffset(element: HTMLElement | any) {
    let offsetLeft = 0;
    let offsetTop = 0;

    do {
        offsetLeft += element.offsetLeft;
        offsetTop += element.offsetTop;

        if (element.id === 'main-container') {
            offsetLeft -= MAIN_CONTAINER_MARGIN;
            offsetTop -= MAIN_CONTAINER_MARGIN;
        }

        element = element.offsetParent;
    } while (element);

    return { left: offsetLeft, top: offsetTop };
}

/**
 * Convert pressure to unit
 * @param pressure - kPa
 */
export function convertPressure(pressure: number, units: 'kPa' | 'psi') {
    pressure = validNumberOrDefault(pressure, null);
    if (pressure == null)
        return null;

    if (units == 'psi')
        return Math.round(pressure * 0.145038 * 10) / 10;
    return Math.round(pressure);
}

/**
 * Convert speed to unit
 * @param speed - m/s
 */
export function convertSpeed(speed: number, units: 'kmh' | 'mph') {
    speed = validNumberOrDefault(speed, 0);
    if (units == 'mph')
        speed = speed * 2.23694;
    else
        speed = speed * 3.6;
    return Math.round(speed);
}


export function validNumberOrDefault(val: number, defaultVal: number) {
    if (isNaN(val))
        return defaultVal;
    return validOrDefault(val, defaultVal);
}

export function validOrDefault(val: any, defaultVal: any) {
    if (!valueIsValid(val))
        return defaultVal;
    return val;
}

export function valueIsValid(val: number) {
    return val != undefined && val != -1;
}

/**
 * Formats duration in seconds to string in format 'mm:ss.sss'
 * @param time - time in seconds
 * @return time in format 'mm:ss.sss'
 */
export function laptimeFormat(time: number): string {
    if (!valueIsValid(time))
        return '-:--.---';

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time - Math.floor(time)) * 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * @param time - time in seconds
 * @return time in format 'hh:mm:ss'
 */
export function timeFormat(time: number): string {
    const hours = Math.floor(time / 3600);
    const minutes = (Math.floor(time / 60) % 60).toString().padStart(2, '0');
    const seconds = (Math.floor(time) % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

export const mapSectorTimes = (sectorTimes: {sector1: number; sector2: number; sector3: number;}) => {
    if (sectorTimes == null)
        return null;
    const res = [sectorTimes.sector1, sectorTimes.sector2, sectorTimes.sector3];
    if (valueIsValid(res[0]) && valueIsValid(res[1])) {
        res[1] -= res[0];

        if (valueIsValid(res[1]) && valueIsValid(res[2])) {
            res[2] -= res[1];
            res[2] -= res[0];
        }
    }
    return res;
}



export function lerpRGB(color1: number[], color2: number[], t: number) {
    t = Math.max(0, Math.min(t, 1));
    let color = [0, 0, 0];
    color[0] = color1[0] + ((color2[0] - color1[0]) * t);
    color[1] = color1[1] + ((color2[1] - color1[1]) * t);
    color[2] = color1[2] + ((color2[2] - color1[2]) * t);
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`
}

export function lerpRGB3(color1: number[], color2: number[], color3: number[], middle: number, t: number) {
    if (t < middle) {
        return lerpRGB(color1, color2, t / middle);
    }
    return lerpRGB(color2, color3, (t - middle) / (1 - middle));
}

export function lerpRGBn(colors: number[][], t: number) {
    const middle = 1 / (colors.length - 1);
    const index = Math.floor(t / middle);
    return lerpRGB(colors[index], index < colors.length - 1 ? colors[index + 1] : [0, 0, 0], t % middle / middle);
}


/**
 * @param {Uint8Array} array
 * @return {string}
 */
export function uint8ArrayToString(array: Uint8Array): string {
    array = array.slice(0, array.indexOf(0));
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(Buffer.from(array));
}

export function insertCell(row: HTMLTableRowElement, value: string, className: string): HTMLTableCellElement {
    let cell: HTMLTableCellElement;
    if (row.getElementsByClassName(className).length > 0) {
        let tmp = row.getElementsByClassName(className)[0];
        if (!(tmp instanceof HTMLTableCellElement))
            throw new Error('tmp is not HTMLTableCellElement');
        cell = tmp;
    } else {
        cell = row.insertCell();
        if (value != null)
            cell.innerHTML = '<span></span>';
    }

    if (value != null)
        cell.firstChild.textContent = value;

    if (className != null)
        cell.className = className;

    return cell;
}
