/* ========================================== Types ========================================== */

import IShared, { EFinishStatus, ESessionPhase, IDriverData, ISectors } from './r3eTypes.js';

export interface IExtendedShared {
  rawData: IShared;
  fuelPerLap: number;
  fuelLastLap: number;
  averageLapTime: number;
  bestLapTime: number;
  estimatedRaceLapCount: number;
  lapsUntilFinish: number;
  forceUpdateAll: boolean;
  timestamp: number;
}

/* ========================================== Constants ========================================== */

// settings
export const CHECK_FOR_UPDATES = 'check-for-updates';
export const SPEED_UNITS = 'speedUnits';
export const PRESSURE_UNITS = 'pressureUnits';
export const RADAR_LOW_DETAIL = 'radarLowDetail';
export const RADAR_OPACITY = 'radarOpacity';
export const RADAR_RANGE = 'radarRange';
export const RADAR_BEEP_VOLUME = 'radarBeepVolume';
export const RADAR_POINTER = 'radarPointer';
export const RADAR_FADE_RANGE ='radarFadeRange';
export const RELATIVE_SAFE_MODE = 'relativeSafeMode';
export const POSITION_BAR_CELL_COUNT = 'positionBarCellCount';
export const DELTA_MODE = 'deltaMode';
export const SHOW_DELTA_ON_INVALID_LAPS = 'showDeltaOnInvalidLaps';
export const FRAMERATE = 'framerate';
export const HARDWARE_ACCELERATION = 'hardwareAcceleration';
export const HUD_LAYOUT = 'hudLayout';
export const P2P_READY_VOLUME = 'p2pReadyVolume';

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

export const TRUCK_CLASS_ID = 9989;

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

/**
 * @return a map of classPerformanceIndex -> color string or null if there is only one class
 */
export function getClassColors(driverData: IDriverData[]) {
  const classColors = new Map<number, string>();
  const classes = getClassesSorted(driverData);
  if (classes.length === 1) {
    classColors.set(classes[0], null);
    return classColors;
  }
  for (let i = 0; i < classes.length; i++) {
    classColors.set(classes[i], lerpRGBn(CLASS_COLORS, i / classes.length));
  }
  return classColors;
}

export function getClassesSorted(driverData: IDriverData[]) {
  const classes = new Set<number>();
  for (const driver of driverData) {
    classes.add(driver.driverInfo.classPerformanceIndex);
  }
  return Array.from(classes).sort((a, b) => a - b);
}

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
  'position-bar': 'Position Bar',
  'position-container': 'Position',
  'completed-laps-container': 'Completed Laps',
  'estimated-laps-left-container': 'Estimated Laps Left',
  'strength-of-field-container': 'Strength of Field',

  'current-laptime-container': 'Current Laptime',

  'last-lap-session-container': 'Last Laptime',
  'best-lap-session-container': 'Best Laptime',
  'best-lap-alltime-container': 'All-time Best',
  'incident-points-container': 'Incident Points',
  'time-left-container': 'Time Left',

  'tires': 'Tires',
  'damage': 'Damage',
  'fuel-data': 'Fuel Data',

  'radar': 'Radar',
  'delta': 'Delta',
  'sector-times': 'Sector Times',
  'pit-timer': 'Pit Timer',

  'relative-viewer': 'Relative',
  'driver-inputs': 'Inputs',
  'basic': 'MoTeC',
  'rake': 'Rake',
  'drs': 'DRS',
  'p2p': 'P2P',
} as const;

export type TransformableId = keyof typeof TRANSFORMABLES;

/* ========================================== Functions ========================================== */
function checkKeys<T>(obj1: T, obj2: T) {
  if (obj1 == null || obj2 == null) throw new Error('objects cannot be null when verifying keys');

  // verify same keys:
  const keys1 = Object.keys(obj1) as (keyof T)[];
  const keys2 = Object.keys(obj2) as (keyof T)[];
  if (keys1.length != keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
  }
  return true;
}
export function addObjects<T>(
  obj1: T,
  obj2: T
): T {
  if (obj1 == null || obj2 == null) return obj1 ?? obj2;

  if (!checkKeys(obj1, obj2)) throw new Error('keys mismatch');

  const res: T = {} as T;
  for (const key of Object.keys(obj1) as (keyof T)[]) {
     res[key] = ((obj1[key] as unknown as number) + (obj2[key] as unknown as number)) as unknown as T[keyof T];
  }
  return res;
}
export function multiplyObject<T>(
  obj1: T,
  by: number
) {
  if (obj1 == null) return null;

  const res: T = {} as T;
  for (const key of Object.keys(obj1) as (keyof T)[]) {
    res[key] = ((obj1[key] as unknown as number) * by) as unknown as T[keyof T];
  }
  return res;
}


export function sessionPhaseNotDriving(sessionPhase: ESessionPhase) {
  return sessionPhase === ESessionPhase.Gridwalk || sessionPhase === ESessionPhase.Countdown || sessionPhase === ESessionPhase.Formation || sessionPhase ===  ESessionPhase.Garage || sessionPhase === ESessionPhase.Unavailable;
}

export function finished(finishStatus: EFinishStatus) {
  return finishedBadly(finishStatus) || finishStatus === EFinishStatus.Finished;
}

export function finishedBadly(finishStatus: EFinishStatus) {
  return finishStatus === EFinishStatus.DNF || finishStatus === EFinishStatus.DQ;
}

export function getSessionType(
  sessionType: keyof typeof SESSION_TYPES
): (typeof SESSION_TYPES)[keyof typeof SESSION_TYPES] {
  if (valueIsValidAssertNull(sessionType) && 0 <= sessionType && sessionType <= 4) {
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
  if (pressure == null) return null;

  if (units == 'psi') return Math.round(pressure * 0.145038 * 10) / 10;
  return Math.round(pressure);
}

/**
 * Convert speed to unit
 * @param speed - m/s
 */
export function convertSpeed(speed: number, units: 'kmh' | 'mph') {
  speed = validNumberOrDefault(speed, 0);
  if (units == 'mph') speed = speed * 2.23694;
  else speed = speed * 3.6;
  return Math.round(speed);
}

export function validNumberOrDefault(val: number, defaultVal: number) {
  if (isNaN(val)) return defaultVal;
  return validOrDefault(val, defaultVal);
}

export function validOrDefault(val: any, defaultVal: any) {
  if (!valueIsValid(val)) return defaultVal;
  return val;
}

export function valueIsValidAssertNull(val: number) {
  if (val == null) throw new Error('value is null');
  return val != -1;
}

export function valueIsValid(val: number) {
  return val != -1 && val != null;
}

export function allValuesAreValid(...values: number[]) {
  for (const val of values) {
    if (!valueIsValidAssertNull(val)) return false;
  }
  return true;
}

/**
 * @param name - base64 encoded name
 * @return formatted name (for example: 'Kodi Nikola Latkovski' -> 'K. N. Latkovski')
 */
export function nameFormat(name: string) {
  const nameSplitted = base64EncodedUint8ArrayToString(name).split(/(\s+)/).filter( e => e.trim().length > 0);
  let nameFormatted = '';
  if (nameSplitted.length != 0) {
    for (let i = 0; i < nameSplitted.length - 1; i++) {
      nameFormatted += nameSplitted[i][0] + '. ';
    }
    nameFormatted += nameSplitted[nameSplitted.length - 1];
  }
  return nameFormatted;
}

/**
 * Formats duration in seconds to string in format 'mm:ss.sss'
 * @param time - time in seconds
 * @param minimize - if true, minutes will be omitted when possible
 * @return time in format 'mm:ss.sss'
 */
export function laptimeFormat(time: number, minimize = false): string {
  if (!valueIsValid(time)) return '-:--.---';

  let prefix = '';
  if (time < 0) {
    prefix = '-';
    time = -time;
  }

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const milliseconds = Math.floor((time - Math.floor(time)) * 1000);

  const withoutMinutes = `${minutes === 0 ? seconds.toString() : seconds.toString().padStart(2, '0')
    }.${milliseconds.toString().padStart(3, '0')}`;
  if (minimize && minutes === 0) return prefix + withoutMinutes;

  return `${prefix}${minutes}:${withoutMinutes}`;
}

/**
 * @param time - time in seconds
 * @return time in format 'hh:mm:ss'
 */
export function timeFormat(time: number): string {
  if (!valueIsValid(time) || Number.isNaN(time)) return '-:--:--';
  const hours = Math.floor(time / 3600);
  const minutes = (Math.floor(time / 60) % 60).toString().padStart(2, '0');
  const seconds = (Math.floor(time) % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export const mapSectorTimes = (sectorTimes: ISectors) => {
  if (sectorTimes == null) return null;
  const res = [sectorTimes.sector1, sectorTimes.sector2, sectorTimes.sector3];
  if (valueIsValid(res[0]) && valueIsValid(res[1])) {
    res[1] -= res[0];

    if (valueIsValid(res[1]) && valueIsValid(res[2])) {
      res[2] -= res[1];
      res[2] -= res[0];
    }
  }
  return res;
};

export function lerpRGB(color1: number[], color2: number[], t: number) {
  t = Math.max(0, Math.min(t, 1));
  let color = [0, 0, 0];
  color[0] = color1[0] + (color2[0] - color1[0]) * t;
  color[1] = color1[1] + (color2[1] - color1[1]) * t;
  color[2] = color1[2] + (color2[2] - color1[2]) * t;
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

export function lerpRGB3(
  color1: number[],
  color2: number[],
  color3: number[],
  middle: number,
  t: number
) {
  if (t < middle) {
    return lerpRGB(color1, color2, t / middle);
  }
  return lerpRGB(color2, color3, (t - middle) / (1 - middle));
}

export function lerpRGBn(colors: number[][], t: number) {
  const middle = 1 / (colors.length - 1);
  const index = Math.floor(t / middle);
  return lerpRGB(
    colors[index],
    index < colors.length - 1 ? colors[index + 1] : [0, 0, 0],
    (t % middle) / middle
  );
}

/**
 * @param array
 */
export function base64EncodedUint8ArrayToString(base64: string): string {
  if (base64 == null) return NA;
  let array = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  array = array.slice(0, array.indexOf(0));
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(Buffer.from(array));
}

export function insertCell(
  row: HTMLTableRowElement,
  value: string,
  className: string
): HTMLTableCellElement {
  let cell: HTMLTableCellElement;
  if (row.getElementsByClassName(className).length > 0) {
    let tmp = row.getElementsByClassName(className)[0];
    if (!(tmp instanceof HTMLTableCellElement))
      throw new Error('tmp is not HTMLTableCellElement');
    cell = tmp;
  } else {
    cell = row.insertCell();
    if (value != null) cell.innerHTML = '<span></span>';
  }

  if (value != null) cell.firstChild.textContent = value;

  if (className != null) cell.className = className;

  return cell;
}


export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function promiseTimeout<T>(promise: Promise<T>, timeout: number) {
  return Promise.race([
    promise,
    new Promise<T>((resolve, reject) => {
      setTimeout(() => reject(new TimeoutError('timeout')), timeout);
    }),
  ]);
}
