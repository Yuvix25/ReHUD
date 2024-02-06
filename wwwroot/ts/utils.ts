import EventListener from './EventListener.js';
import HubCommunication from './HubCommunication.js';
import Hud from './Hud.js';
import SettingsValue from './SettingsValue.js';
import { RELATIVE_SAFE_MODE, base64EncodedUint8ArrayToString, valueIsValid } from './consts.js';
import { ESession, IDriverData, IDriverInfo } from './r3eTypes.js';
import { RawSourceMap, SourceMapConsumer } from 'source-map-js';

export class DeltaManager {
  static DELTA_WINDOW: number = 10; // seconds
  static DELTA_OF_DELTA_MULTIPLIER: number = 1.5;
  static deltaWindow: Array<[number, number]> = [];

  /**
   * Add a delta to the delta window.
   */
  static addDelta(delta: number) {
    const time = Hud.getGameTimestamp();
    DeltaManager.deltaWindow.push([time, delta]);
    while (DeltaManager.deltaWindow[0][0] < time - DeltaManager.DELTA_WINDOW)
      DeltaManager.deltaWindow.shift();
  }

  static getLastDelta(): [number, number] {
    if (DeltaManager.deltaWindow.length == 0)
      return null;
    return DeltaManager.deltaWindow[DeltaManager.deltaWindow.length - 1];
  }

  /**
   * Get some sort of delta of the delta itself during the window.
   */
  static getDeltaOfDeltas(mult?: number): number {
    if (DeltaManager.deltaWindow.length == 0)
      return 0;


    const lastDelta = this.getLastDelta()[1]
    const lastTime = this.getLastDelta()[0];

    const timeRange = lastTime - DeltaManager.deltaWindow[0][0];

    let res = 0;
    let weight = 0;
    for (let i = DeltaManager.deltaWindow.length - 1; i >= 0; i--) {
      const deltaData = DeltaManager.deltaWindow[i];
      const deltaDelta = lastDelta - deltaData[1];
      const deltaWeight = (timeRange - (lastTime - deltaData[0])) / timeRange;
      res += deltaDelta * deltaWeight;
      weight += deltaWeight;
    }
    res = res / weight * (mult ?? DeltaManager.DELTA_OF_DELTA_MULTIPLIER);
    return res / (Math.abs(res) + 0.5);
  }

  /**
   * Clear the delta window.
   */
  static clear() {
    DeltaManager.deltaWindow = [];
  }
}

export class Driver extends EventListener {
  override sharedMemoryKeys: string[] = []; // while this class does use shared memory, it's provided as single values by the driver manager, so it does not directly access the shared memory object
  override isEnabled(): boolean {
    return true;
  }

  static readonly MIN_LAP_TIME: number = 10; // seconds

  static pointsPerMeter = 0.5;
  static positionJumpThreshold = 150; // meters

  static mainDriver: Driver = null;
  static onMainDriverQeue: Array<(driver: Driver) => void> = [];

  userId: string;
  trackLength: number;
  points: number[];
  currentIndex: number = null;
  currentLapValid: boolean = true;
  lastLapTime: number = null;
  bestLap: number[] = null;
  sessionBestLap: number[] = null;
  bestLapTime: number = null;
  sessionBestLapTime: number = null;
  bestLapTimeValid: boolean = false;
  completedLaps: number = null;
  crossedFinishLine: number = null;
  previousDistance: number = -1;
  attemptedLoadingBestLap: boolean = false;

  /**
   * Represents a driver
   */
  constructor(userId: string, trackLength: number, completedLaps: number) {
    super(userId);
    this.userId = userId;
    this.trackLength = trackLength;
    this.completedLaps = completedLaps;

    this.points = this.newPointArray(); // points[distance] = time
  }

  /**
   * Sets the main driver (the one currently being viewed)
   */
  static setMainDriver(driver: Driver) {
    const newMainDriver = driver != Driver.mainDriver;

    if (newMainDriver) {
      console.log('Setting main driver to', driver.userId);
    };

    Driver.mainDriver = driver;

    for (const callback of Driver.onMainDriverQeue) {
      try {
        callback(driver);
      } catch (e) {
        console.error('Error while executing onMainDriver callback', e);
      }
    }
    Driver.onMainDriverQeue = [];

    if (
      !driver.attemptedLoadingBestLap &&
      (driver.bestLap == null || !driver.bestLapTimeValid)
    ) {
      driver.attemptedLoadingBestLap = true;
      return true;
    }
    return false;
  }

  static onMainDriver(callback: (driver: Driver) => void) {
    if (Driver.mainDriver != null) {
      callback(Driver.mainDriver);
      return;
    }
    Driver.onMainDriverQeue.push(callback);
  }

  /**
   * Sets the main driver to this driver.
   */
  setAsMainDriver() {
    return Driver.setMainDriver(this);
  }

  static loadBestLap(
    bestLapTime: number,
    points: number[],
    pointsPerMeter: number
  ) {
    this.onMainDriver((driver) => {
      let newPoints = driver.newPointArray();
      if (pointsPerMeter > Driver.pointsPerMeter) {
        for (let i = 0; i < newPoints.length; i++) {
          newPoints[i] =
            points[Math.floor((i / pointsPerMeter) * Driver.pointsPerMeter)];
        }
      } else {
        for (let i = 0; i < points.length; i++) {
          newPoints[Math.floor((i / Driver.pointsPerMeter) * pointsPerMeter)] =
            points[i];
        }
      }

      driver.bestLapTime = bestLapTime;
      driver.bestLap = newPoints;
      driver.bestLapTimeValid = true;

      console.log('Loaded saved best', driver.bestLapTime);
    });
  }

  /**
   * Initializes a new point array.
   */
  newPointArray(): Array<number> {
    return Array(Math.floor(this.trackLength * Driver.pointsPerMeter)).fill(
      null
    );
  }

  /**
   * Erases the temporary data of the driver.
   */
  clearTempData() {
    this.crossedFinishLine = null;
    this.currentIndex = null;
    this.setLapInvalid();
    this.points = this.newPointArray();
  }

  /**
   * Add a point to the delta path.
   * MUST BE CALLED AFTER `endLap` IF THE LAP IS COMPLETED.
   */
  addDeltaPoint(distance: number, completedLaps: number) {
    const time = Hud.getGameTimestamp();

    const newCurrentIndex = Math.floor(distance * Driver.pointsPerMeter);
    if (this.currentIndex == null) {
      this.currentIndex = newCurrentIndex;
    } else {
      const gapToSpot = newCurrentIndex - this.currentIndex;
      if (gapToSpot >= 0) {
        for (let i = 0; i < gapToSpot; i++) {
          this.points[this.currentIndex + i + 1] = valueIsValid(this.currentIndex) ? this.points[this.currentIndex] + (time - this.points[this.currentIndex]) / gapToSpot * (i + 1) : time;
        }
        this.currentIndex = newCurrentIndex;
      } else if ((gapToSpot / Driver.pointsPerMeter) < -Driver.positionJumpThreshold) { // negative progress shouldn't happen, endLap is supposed to move currentIndex back to -1
        this.clearTempData();
      }
    }

    this.previousDistance = distance;
    this.completedLaps = completedLaps;
  }

  setLapInvalid() {
    this.currentLapValid = false;
  }

  /**
   * End the current lap.
   * MUST BE CALLED BEFORE `addDeltaPoint`.
   * @return Whether the best lap should be saved (new best valid lap, main driver)
   */
  endLap(laptime: number, completedLaps: number, sessionType: ESession): boolean {
    let shouldSaveBestLap = false;

    const time = Hud.getGameTimestamp();

    for (let i = this.currentIndex + 1; i < this.points.length; i++) {
      this.points[i] = this.points[this.currentIndex];
    }
    this.currentIndex = -1;

    if (this.crossedFinishLine != null && (sessionType !== ESession.Race || completedLaps > 1)) {
      if (!valueIsValid(laptime)) {
        laptime = time - this.points[0];
      }

      this.lastLapTime = laptime;

      if (!SettingsValue.get(RELATIVE_SAFE_MODE)) {
        if (laptime < Driver.MIN_LAP_TIME) {
          console.warn(`Invalid lap time for`, this.userId, laptime);
          this.setLapInvalid();
        } else {
          let didUpdateBestLap = false;
          if (this.bestLapTime == null || (laptime < this.bestLapTime && (this.currentLapValid || !this.bestLapTimeValid))) {
            if (this.currentLapValid && Driver.mainDriver === this) {
              shouldSaveBestLap = true;
            }
            if (shouldSaveBestLap || this.completedLaps >= 0) {
              this.bestLap = this.points.slice();
              this.bestLapTime = laptime;
              this.bestLapTimeValid = this.currentLapValid;
              
              console.log('New best lap for', this.userId, laptime, this.bestLapTimeValid);
              didUpdateBestLap = true;
            }
          }

          if (this.currentLapValid && (this.sessionBestLapTime == null || laptime < this.sessionBestLapTime)) {
            this.sessionBestLap = this.points.slice();
            this.sessionBestLapTime = laptime;

            if (!didUpdateBestLap) {
              console.log('New session best for', this.userId, laptime);
            }
          }
        }
      }
    }

    this.crossedFinishLine = Hud.getGameTimestamp();
    this.currentLapValid = true;

    return shouldSaveBestLap;
  }

  /**
   * Save the best lap (locally)
   */
  saveBestLap(
    layoutId: number,
    carClassId: number,
  ) {
    Hud.hub.invoke('SaveBestLap', layoutId, carClassId, this.bestLapTime, this.bestLap, Driver.pointsPerMeter);
  }

  /**
   * Get a relative time delta to another driver on track (positions are based on the last delta points).
   */
  getDeltaToDriverAhead(
    driver: Driver,
  ): number {
    const thisLapDistance = this.currentIndex;
    const otherLapDistance = driver.currentIndex;

    if (thisLapDistance == null || otherLapDistance == null) return null;

    if (
      (Driver.mainDriver === this || Driver.mainDriver === driver) &&
      Driver.mainDriver.bestLap != null
    ) {
      const res = Driver.mainDriver.deltaBetweenPoints(
        thisLapDistance,
        otherLapDistance,
        true,
        false
      );

      if (res != null && res >= 0) {
        if (otherLapDistance < thisLapDistance)
          return Driver.mainDriver.getEstimatedLapTime() - res;
        return res;
      }
    }

    if (otherLapDistance < thisLapDistance) {
      let res;
      let estimatedLapTime =
        this.getEstimatedLapTime() || driver.getEstimatedLapTime();

      res = driver.deltaBetweenPoints(otherLapDistance, thisLapDistance, false);
      if (res != null) return res;

      if (estimatedLapTime == null) return null;

      const delta = driver.getDeltaToDriverAhead(this);
      res = estimatedLapTime - delta;
      if (delta == null || res < 0) return null;

      return res;
    } else {
      let res = this.deltaBetweenPoints(
        thisLapDistance,
        otherLapDistance,
        true,
        false
      );
      if (res == null) {
        res = driver.deltaBetweenPoints(thisLapDistance, otherLapDistance);
      }
      return res;
    }
  }

  getDeltaToDriverBehind(
    driver: Driver,
  ): number {
    return driver.getDeltaToDriverAhead(this);
  }

  /**
   * The delta between two points on the track (distances).
   * Calculated using either the current lap or the best lap.
   */
  deltaBetweenPoints(
    point1: number,
    point2: number,
    useBestLap: boolean = true,
    fallbackToCurrentLap: boolean = true
  ): number {
    let usingBestLap = false;
    let lapData;
    if (useBestLap && this.bestLap != null) {
      lapData = this.bestLap;
      usingBestLap = true;
    } else if (fallbackToCurrentLap) {
      lapData = this.points;
    } else {
      return null;
    }

    const point1Time = lapData[point1];
    const point2Time = lapData[point2];

    if (point1Time == null || point2Time == null) {
      if (usingBestLap && fallbackToCurrentLap) {
        return this.deltaBetweenPoints(point1, point2, false);
      }
      return null;
    }

    return Math.abs(point2Time - point1Time);
  }

  getDeltaToLap(lap: number[], distance: number, currentTime?: number) {
    if (lap.length === 0 || this.crossedFinishLine == null) return null;

    // lerp instead:
    const index = Math.floor(distance * Driver.pointsPerMeter);
    if (index >= lap.length) return null;
    
    let timeInLap;
    if (index === lap.length - 1) {
      timeInLap = lap[index];
      if (timeInLap == null) return null;
    } else {
      const time1 = lap[index];
      const time2 = lap[index + 1];
      if (time1 == null || time2 == null) return null;
      timeInLap = time1 + (time2 - time1) * (distance * Driver.pointsPerMeter - index);
    }

    timeInLap = timeInLap - lap[0];

    if (!valueIsValid(currentTime)) {
      currentTime = this.getCurrentTime();
    }

    return currentTime - timeInLap;
  }

  getCurrentTime(): number {
    if (this.crossedFinishLine == null) return null;
    
    return Hud.getGameTimestamp() - this.crossedFinishLine;
  }


  /**
   * Get the track distance to a driver ahead.
   */
  getDistanceToDriverAhead(driver: Driver): number {
    const thisLapDistance = this.currentIndex;
    const otherLapDistance = driver.currentIndex;

    if (thisLapDistance == null || otherLapDistance == null) return null;

    if (otherLapDistance < thisLapDistance) {
      return this.trackLength - thisLapDistance + otherLapDistance;
    }
    return otherLapDistance - thisLapDistance;
  }

  /**
   * Get the track distance to a driver behind.
   */
  getDistanceToDriverBehind(driver: Driver): number {
    return driver.getDistanceToDriverAhead(this);
  }

  static average: number = 0;
  static count: number = 0;

  getEstimatedLapTime(): number {
    if (this.bestLapTime == null) {
      if (this.bestLap == null) {
        return null;
      }
      // Get invalid lap time from the best lap
      return this.bestLap[this.bestLap.length - 1] - this.bestLap[0];
    }
    // Return the best lap time
    return this.bestLapTime;
  }
}


export interface IExtendedDriverInfo extends IDriverInfo {
  uid?: string;
}

export interface IExtendedDriverData extends IDriverData {
  driverInfo: IExtendedDriverInfo;
}

/**
 * @param driverInfo - DriverData[x].DriverInfo
 * @return Unique ID for the driver (JSON of some fields)
 */
export function computeUid(driverInfo: IDriverInfo): string {
  if (driverInfo == null)
    return null;
  const obj = {
    name: base64EncodedUint8ArrayToString(driverInfo.name),
    userId: driverInfo.userId,
    slotId: driverInfo.slotId,
    carId: driverInfo.liveryId,
  };
  return JSON.stringify(obj);
}

export function getUid(driverInfo: IDriverInfo): string {
  return (driverInfo as IExtendedDriverInfo)?.uid ?? computeUid(driverInfo);
}

export function getRadarPointerRotation(d: number, x: number, z: number): number {
  const angle = Math.acos(Math.abs(z) / d);
  if(x > 0 && z > 0) {
    return angle;
  } else if (x > 0 && z < 0) {
    return (-angle);
  } else if (x < 0 && z > 0) {
    return (-angle);
  } else {
    return angle;
  }
}

export type Vector = { x: number; y: number; z: number; };

export function vectorSubtract(a: Vector, b: Vector): Vector {
  const res = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }
  return res;
}

export function distanceFromZero(a: Vector): number {
  return Math.sqrt(a.x ** 2 + a.z ** 2);
}

/**
 * Get a rotation matrix from the given eular angles - inverted.
 */
export function rotationMatrixFromEular(eular: Vector): Array<Array<number>> {
  const x = -eular.x;
  const y = -eular.y;
  const z = -eular.z;

  const c1 = Math.cos(x);
  const s1 = Math.sin(x);
  const c2 = Math.cos(y);
  const s2 = Math.sin(y);
  const c3 = Math.cos(z);
  const s3 = Math.sin(z);

  return [
    [c2 * c3, -c2 * s3, s2],
    [c1 * s3 + c3 * s1 * s2, c1 * c3 - s1 * s2 * s3, -c2 * s1],
    [s1 * s3 - c1 * c3 * s2, c3 * s1 + c1 * s2 * s3, c1 * c2]
  ];
}

/**
 * Rotate the given vector by the given matrix.
 */
export function rotateVector(matrix: Array<Array<number>>, vector: Vector): Vector {
  return {
    x: matrix[0][0] * vector.x + matrix[0][1] * vector.y + matrix[0][2] * vector.z,
    y: matrix[1][0] * vector.x + matrix[1][1] * vector.y + matrix[1][2] * vector.z,
    z: matrix[2][0] * vector.x + matrix[2][1] * vector.y + matrix[2][2] * vector.z,
  };
}


export function mpsToKph(mps: number) {
  return mps * 3.6;
}



export class AudioController {
  audio: HTMLAudioElement = new Audio();
  audioIsPlaying: boolean = false;
  audioContext: AudioContext = new AudioContext();
  mediaSource: MediaElementAudioSourceNode = this.audioContext.createMediaElementSource(this.audio);
  stereoPanner: StereoPannerNode = this.audioContext.createStereoPanner();

  minPlaybackRate: number;
  maxPlaybackRate: number;
  playbackRateMultiplier: number;
  volumeMultiplier: number;
  soundFileName: string;

  constructor({ minPlaybackRate = 0.1, maxPlaybackRate = 10, playbackRateMultiplier = 2, volumeMultiplier = 1, soundFileName = '' } = {}) {
    this.minPlaybackRate = minPlaybackRate;
    this.maxPlaybackRate = maxPlaybackRate;
    this.playbackRateMultiplier = playbackRateMultiplier;
    this.volumeMultiplier = volumeMultiplier;
    this.soundFileName = soundFileName;

    this.mediaSource.connect(this.stereoPanner);
    this.stereoPanner.connect(this.audioContext.destination);

    this.audio.src = `/sounds/${this.soundFileName}`;

    this.audio.onplaying = () => {
      this.audioIsPlaying = true;
    };
    this.audio.onended = () => {
      this.audioIsPlaying = false;
    };
  }

  setVolume(volume: number) {
    this.volumeMultiplier = volume;
  }

  /**
   * @param {number} amount - Controls the volume and playback rate of the audio (higher = louder and faster)
   * @param {number} pan - Controls the panning of the audio (negative = left, positive = right), between -1 and 1
   */
  play(amount: number, pan: number) {
    this.audio.volume = Math.max(0, Math.min(1, amount / 10 * this.volumeMultiplier));
    this.audio.playbackRate = Math.min(Math.max(this.minPlaybackRate, amount * this.playbackRateMultiplier), this.maxPlaybackRate);
    this.stereoPanner.pan.value = pan;

    if (this.audio.paused && this.audioContext.state !== 'suspended' && !this.audioIsPlaying) {
      this.audio.play().catch(() => { });
    }
  }
}

enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export const realConsoleError = console.error;

const FLOOD_MAX_GAP = 0.7 * 1000;
const FLOOD_CLEAR_TIME = 15 * 1000;


class LogMessage {
  private messageIdentifier: string;
  private lastFullMessage: string;
  private floodCount: number;
  private sameFullMessage: boolean;
  private firstTime: number = 0;
  private lastTime: number = 0;

  constructor(
    messageIdentifier: string,
    fullMessage: string,
  ) {
    this.messageIdentifier = messageIdentifier;
    this.lastFullMessage = fullMessage;
    this.floodCount = 0;
    this.sameFullMessage = true;
  }

  /**
   * - floodCount = 0: first message - always log.
   * - floodCount = 1: second message - log if the time gap is big enough.
   * - floodCount > 1: third message and onwards - time gap was small enough once, so we consider this a flood from now until the next clear.
   * @param fullMessage
   * @return Whether the message should be logged (or if it's flooding)
   */
  log(fullMessage: string) {
    const now = Date.now();
    const gap = now - this.lastTime;
    this.lastTime = now;
    this.sameFullMessage = this.lastFullMessage == null || (this.sameFullMessage && fullMessage === this.lastFullMessage);
    this.lastFullMessage = fullMessage;

    if (this.floodCount === 0 || (this.floodCount === 1 && gap >= FLOOD_MAX_GAP)) {
      if (this.floodCount === 0) {
        this.firstTime = now;
        this.floodCount++
      }

      this.lastFullMessage = null;
      return true;
    }
    this.floodCount++;

    return false;
  }

  notFlooding() {
    return this.floodCount == 0;
  }

  getFloodCount() {
    return this.floodCount;
  }

  clear() {
    if (this.notFlooding()) {
      return null;
    }

    let message = this.sameFullMessage ? this.lastFullMessage : this.messageIdentifier;

    let res = null;

    if (this.floodCount == 2) {
      res = message;
    } else if (this.floodCount > 2) {
      res = `Message repeated ${this.floodCount-1} times: ${message}`; // -1 because the first message is already logged);
    }
    this.floodCount = 1;
    this.sameFullMessage = true;
    this.lastFullMessage = null;

    return res;
  }

  getFirstTimestamp() {
    return this.firstTime;
  }
  getLastTimestamp() {
    return this.lastTime;
  }
};

class MessagePool {
  private readonly logger: Logger;
  private readonly level: LogLevel;
  private readonly pool: Map<string, LogMessage> = new Map();

  constructor(logger: Logger, level: LogLevel) {
    this.logger = logger;
    this.level = level;
  }

  getMessage(messageIdentifier: string, fullMessage: string): LogMessage {
    let message = this.pool.get(messageIdentifier);
    if (message == undefined) {
      message = new LogMessage(messageIdentifier, fullMessage);
      this.pool.set(messageIdentifier, message);
    }
    return message;
  }

  log(messageIdentifier: string, fullMessage: string) {
    const message = this.getMessage(messageIdentifier, fullMessage);
    if (message.log(fullMessage)) {
      this.logger.log(fullMessage, this.level, message.getLastTimestamp());
    }
  }

  isFlooding(messageIdentifier: string) {
    const message = this.pool.get(messageIdentifier);
    return message != undefined && !message.notFlooding();
  }

  clear() {
    for (const message of this.pool.values()) {
      const messageToLog = message.clear();
      if (messageToLog != null) {
        this.logger.log(messageToLog, this.level, message.getFirstTimestamp(), message.getFloodCount() > 1 ? message.getLastTimestamp() : -1);
      }
    }
    this.pool.clear();
  }
}

export class Logger {
  private static readonly instances = new Set<Logger>();

  private readonly filename: string;
  private readonly messagePools: { [key in LogLevel]?: MessagePool } = {};
  private readonly callbacks: {
    [key in LogLevel]?: Array<(...args: any[]) => void>;
  } = {};

  constructor(filename: string) {
    this.filename = filename;

    if (filename == null) {
      this.log('Logger error: filename is null', LogLevel.ERROR);
      throw new Error('Logger error has occured, see log for details'); // don't want to throw the same error message, because the error handler might catch it and also log it, causing a duplicate log
    }

    Logger.instances.add(this);

    for (const level of Object.values(LogLevel)) {
      this.messagePools[level] = new MessagePool(this, level);
    }

    setInterval(() => {
      this.clear();
    }, FLOOD_CLEAR_TIME);
  }

  clear(log: boolean = false) {
    if (log) this.log(`Clearing log pools for ${this.filename}`, LogLevel.INFO);
    for (const pool of Object.values(this.messagePools)) {
      pool.clear();
    }
  }

  static clear(log: boolean = false) {
    for (const instance of this.instances) {
      instance.clear(log);
    }
  }

  log(
    message: string,
    level: LogLevel = LogLevel.INFO,
    startTimestamp: number = -1,
    endTimestamp: number = -1
  ) {
    if (this.callbacks[level] != undefined) {
      for (const callback of this.callbacks[level]) {
        callback(message);
      }
    }
    Hud.hub.invoke('Log', level, startTimestamp, endTimestamp, message);
  }

  logFunction(callback: (...args: any[]) => void, level: LogLevel) {
    if (this.callbacks[level] == undefined) {
      this.callbacks[level] = [];
    }
    this.callbacks[level].push(callback);

    const pool = this.messagePools[level];
    const loggerInstance = this;

    return function (...args: any[]) {
      let origin = loggerInstance.filename;

      const messageIdentifier = JSON.stringify(args[0]);
      const message = args.map((x) => JSON.stringify(x)).join(' ');
      let fullMessage = `${origin}: ${message}`;

      if (pool.isFlooding(messageIdentifier) || level !== LogLevel.ERROR) {
        pool.log(messageIdentifier, fullMessage);
      } else {
        Logger.getMappedStackTrace().then((stack) => {
          try {
            const caller_line = stack.split('\n')[8];
            if (caller_line == undefined) {
              throw new Error('stacktrace too short');
            }
            const index = caller_line.indexOf('at ');
            origin = caller_line.slice(index + 1, caller_line.length) ?? origin;
          } catch (e) {}

          fullMessage = `${origin}: ${message}`;
          pool.log(messageIdentifier, fullMessage);
        });
      }
    };
  }

  private static readonly sourceMaps: { [key: string]: RawSourceMap } = {};
  private static async getSourceMapFromUri(uri: string) {
    if (Logger.sourceMaps[uri] != undefined) {
      return Logger.sourceMaps[uri];
    }
    const uriQuery = new URL(uri).search;
    const currentScriptContent = await (await fetch(uri)).text();

    let mapUri = RegExp(/\/\/# sourceMappingURL=(.*)/).exec(
      currentScriptContent
    )[1];
    mapUri = new URL(mapUri, uri).href + uriQuery;

    const map = await (await fetch(mapUri)).json();

    Logger.sourceMaps[uri] = map;

    return map;
  }

  private static async mapStackTrace(stack: string) {
    realConsoleError(stack);
    const stackLines = stack.split('\n');
    const mappedStack = [];

    for (const line of stackLines) {
      const match = RegExp(/(.*)(http:\/\/.*):(\d+):(\d+)/).exec(line);
      if (match == null) {
        mappedStack.push(line);
        continue;
      }

      const uri = match[2];
      const consumer = new SourceMapConsumer(
        await Logger.getSourceMapFromUri(uri)
      );

      const originalPosition = consumer.originalPositionFor({
        line: parseInt(match[3]),
        column: parseInt(match[4]),
      });

      if (
        originalPosition.source == null ||
        originalPosition.line == null ||
        originalPosition.column == null
      ) {
        mappedStack.push(line);
        continue;
      }

      mappedStack.push(
        `${originalPosition.source}:${originalPosition.line}:${
          originalPosition.column + 1
        }`
      );
    }

    return mappedStack.join('\n');
  }

  static async mapStackTraceAsync(stack: string): Promise<string> {
    try {
      return await Logger.mapStackTrace(stack);
    } catch (e) {
      realConsoleError(e);
      return stack;
    }
  }

  public static async getMappedStackTrace(): Promise<string> {
    return await Logger.mapStackTraceAsync(Logger.getStackTrace());
  }

  public static getStackTrace(): string {
    try {
      throw Error('');
    } catch (err) {
      return err.stack;
    }
  }
}

export function enableLogging(ipc: import('electron').IpcRenderer, filename: string) {
  const logger = new Logger(filename);

  ipc.on('quit', () => {
    Logger.clear(true);
  });

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  console.log = logger.logFunction(originalLog, LogLevel.INFO);
  console.warn = logger.logFunction(originalWarn, LogLevel.WARN);
  console.error = logger.logFunction(originalError, LogLevel.ERROR);


  window.onerror = async (_message, _file, _line, _column, errorObj) => {
    if (errorObj?.stack !== undefined) {
      console.error(await Logger.mapStackTraceAsync(errorObj.stack));
    }

    return false;
  };
  window.addEventListener('unhandledrejection', (e) => {
    console.error(JSON.stringify(e.reason));
  });
  window.addEventListener('securitypolicyviolation', (e) => {
    const message = `Blocked '${e.blockedURI}' from ${e.documentURI}:${e.lineNumber} (${e.violatedDirective})`;
    console.error(message);
  });
}
