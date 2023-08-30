import {uint8ArrayToString, valueIsValid} from './consts.js';
import {IDriverData, IDriverInfo} from './r3eTypes';

export class DeltaManager {
  static DELTA_WINDOW: number = 10; // seconds
  static DELTA_OF_DELTA_MULTIPLIER: number = 1.5; // seconds
  static deltaWindow: Array<[number, number]> = [];

  /**
   * Add a delta to the delta window.
   */
  static addDelta(delta: number) {
    const time = Driver.getTime();
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
  static getDeltaOfDeltas(): number {
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
    res = res / weight * DeltaManager.DELTA_OF_DELTA_MULTIPLIER;
    return res / (Math.abs(res) + 0.5);
  }

  /**
   * Clear the delta window.
   */
  static clear() {
    DeltaManager.deltaWindow = [];
  }
}

export class Driver {
  static pointsPerMeter = 0.5;
  static positionJumpThreshold = 150; // meters

  static mainDriver: Driver = null;

  userId: string;
  trackLength: number;
  points: number[];
  currentIndex: number;
  currentLapValid: boolean;
  bestLap: number[];
  bestLapTime: number;
  bestLapTimeValid: boolean;
  completedLaps: number;
  crossedFinishLine: boolean;
  previousDistance: number;
  attemptedLoadingBestLap: boolean;

  /**
   * Represents a driver
   */
  constructor(userId: string, trackLength: number, completedLaps: number) {
    this.userId = userId;
    this.trackLength = trackLength;
    this.points = this.newPointArray(); // points[distance] = time
    this.currentIndex = null;
    this.currentLapValid = true;
    this.bestLap = null;
    this.bestLapTime = null;
    this.bestLapTimeValid = false;
    this.completedLaps = completedLaps;

    this.attemptedLoadingBestLap = false;

    this.crossedFinishLine = false;
    this.previousDistance = -1;
  }


  /**
   * Get the current time.
   * @return Time in seconds
   */
  static getTime(): number {
    return new Date().getTime() / 1000;
  }

  /**
   * Sets the main driver (the one currently being viewed)
   * @return Whether an attempt should be made to load a saved lap
   */
  static setMainDriver(driver: Driver) {
    Driver.mainDriver = driver;

    if (!driver.attemptedLoadingBestLap && (driver.bestLap == null || !driver.bestLapTimeValid)) {
      driver.attemptedLoadingBestLap = true;
      return true;
    }
    return false;
  }

  /**
   * Sets the main driver to this driver.
   */
  setAsMainDriver() {
    return Driver.setMainDriver(this);
  }

  loadBestLap(bestLapTime: number, points: number[], pointsPerMeter: number) {
    let newPoints = this.newPointArray();
    if (pointsPerMeter > Driver.pointsPerMeter) {
      for (let i = 0; i < newPoints.length; i++) {
        newPoints[i] = points[Math.floor(i / pointsPerMeter * Driver.pointsPerMeter)];
      }
    } else {
      for (let i = 0; i < points.length; i++) {
        newPoints[Math.floor(i / Driver.pointsPerMeter * pointsPerMeter)] = points[i];
      }
    }

    this.bestLapTime = bestLapTime;
    this.bestLap = newPoints;
    this.bestLapTimeValid = true;

    console.log(`Loaded saved best lap for ${this.userId}`);
  }

  /**
   * Initializes a new point array.
   */
  newPointArray(): Array<number> {
    return Array(Math.floor(this.trackLength * Driver.pointsPerMeter)).fill(null);
  }


  /**
   * Erases the temporary data of the driver.
   */
  clearTempData() {
    this.crossedFinishLine = false;
    this.currentLapValid = false;
    this.currentIndex = null;
    this.points = this.newPointArray();
  }


  /**
   * Add a point to the delta path.
   * MUST BE CALLED AFTER `endLap` IF THE LAP IS COMPLETED.
   */
  addDeltaPoint(distance: number, completedLaps: number) {
    const time = Driver.getTime();

    if (this.previousDistance != -1 && this.previousDistance - distance > this.trackLength / 2 && this.completedLaps == null) { // TODO: get rid of this when RR decides to fix its CompletedLaps value...
      this.crossedFinishLine = true;
    }

    const newCurrentIndex = Math.floor(distance * Driver.pointsPerMeter);
    if (this.currentIndex == null) {
      this.currentIndex = newCurrentIndex;
    } else {
      const gapToSpot = newCurrentIndex - this.currentIndex;
      if (gapToSpot >= 0) {
        for (let i = 0; i < gapToSpot; i++) {
          this.points[++this.currentIndex] = time;
        }
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
  endLap(laptime: number): boolean {
    let shouldSaveBestLap = false;

    const time = Driver.getTime();

    for (let i = this.currentIndex + 1; i < this.points.length; i++) {
      this.points[i] = this.points[this.currentIndex];
    }
    this.currentIndex = -1;

    if (this.crossedFinishLine) {
      if (!valueIsValid(laptime)) laptime = time - this.points[0];

      if (this.bestLapTime == null || (laptime < this.bestLapTime && (this.currentLapValid || !this.bestLapTimeValid))) {
        if (this.currentLapValid && Driver.mainDriver === this) {
          shouldSaveBestLap = true;
        }
        if (shouldSaveBestLap || this.completedLaps >= 0) {
          this.bestLap = this.points.slice();
          this.bestLapTime = laptime;
        }
      }
    }

    this.crossedFinishLine = true;
    this.currentLapValid = true;

    return shouldSaveBestLap;
  }

  /**
   * Save the best lap (locally)
   */
  saveBestLap(layoutId: number, carClassId: number, ipcRenderer: import('electron').IpcRenderer) {
    ipcRenderer.send('save-best-lap', [
      layoutId,
      carClassId,
      this.bestLapTime,
      this.bestLap,
      Driver.pointsPerMeter,
    ]);
  }

  /**
   * Get a relative delta to another driver (positions are based on the last delta points).
   * @return If `includeLapDifference` is true and the lap difference between the drivers is not 0,
   * the lap difference will be returned instead of the delta. Otherwise, the delta will be returned.
   */
  getDeltaToDriverAhead(driver: Driver, includeLapDifference: boolean = false): number { // TODO: implement includeLapDifference
    const thisLapDistance = this.currentIndex;
    const otherLapDistance = driver.currentIndex;

    if (thisLapDistance == null || otherLapDistance == null)
      return null;

    if ((Driver.mainDriver === this || Driver.mainDriver === driver) && Driver.mainDriver.bestLap != null) {
      const res = Driver.mainDriver.deltaBetweenPoints(thisLapDistance, otherLapDistance, true, false);

      if (res != null && res >= 0) {
        if (otherLapDistance < thisLapDistance)
          return Driver.mainDriver.getEstimatedLapTime() - res;
        return res;
      }
    }

    if (otherLapDistance < thisLapDistance) {
      let res;
      let estimatedLapTime = this.getEstimatedLapTime() || driver.getEstimatedLapTime();

      res = driver.deltaBetweenPoints(otherLapDistance, thisLapDistance, false);
      if (res != null)
        return res;
      
      if (estimatedLapTime == null)
        return null;

      const delta = driver.getDeltaToDriverAhead(this, includeLapDifference);
      res = estimatedLapTime - delta;
      if (delta == null || res < 0)
        return null;

      return res;
    } else {
      let res = this.deltaBetweenPoints(thisLapDistance, otherLapDistance, true, false);
      if (res == null) {
        res = driver.deltaBetweenPoints(thisLapDistance, otherLapDistance);
      }
      return res
    }
  }

  getDeltaToDriverBehind(driver: Driver, includeLapDifference: boolean = false): number {
    return driver.getDeltaToDriverAhead(this, includeLapDifference);
  }

  /**
   * The delta between two points on the track (distances).
   * Calculated using either the current lap or the best lap.
   */
  deltaBetweenPoints(point1: number, point2: number, useBestLap: boolean = true, fallbackToCurrentLap: boolean = true): number {
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

  /**
   * Get the track distance to a driver ahead.
   */
  getDistanceToDriverAhead(driver: Driver): number {
    const thisLapDistance = this.currentIndex;
    const otherLapDistance = driver.currentIndex;

    if (thisLapDistance == null || otherLapDistance == null)
      return null;

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
export function getUid(driverInfo: IDriverInfo): string {
  const obj = {
    name: uint8ArrayToString(driverInfo.name),
    classId: driverInfo.classId,
    teamId: driverInfo.teamId,
    userId: driverInfo.userId,
    liveryId: driverInfo.liveryId,
    engineType: driverInfo.engineType,
  };
  return JSON.stringify(obj);
}

/**
 * Calculates the standard deviation of the given values.
 */
export function standardDeviation(values: number[]): number {
  var avg = average(values);

  var squareDiffs = values.map(function (value) {
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

/**
 * Average of the given values.
 */
function average(data: number[]): number {
  var sum = data.reduce(function (sum, value) {
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}


export type Vector = {x: number; y: number; z: number;};

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

  constructor({ minPlaybackRate = 0.1, maxPlaybackRate = 10, playbackRateMultiplier = 2, volumeMultiplier = 1 } = {}) {
    this.minPlaybackRate = minPlaybackRate;
    this.maxPlaybackRate = maxPlaybackRate;
    this.playbackRateMultiplier = playbackRateMultiplier;
    this.volumeMultiplier = volumeMultiplier;

    this.mediaSource.connect(this.stereoPanner);
    this.stereoPanner.connect(this.audioContext.destination);

    this.audio.src = '/sounds/beep.wav';

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

function writeToLog(ipc: import('electron').IpcRenderer, message: string, level: LogLevel = LogLevel.INFO) {
  ipc.send('log', { message, level });
}


export function enableLogging(ipc: import('electron').IpcRenderer, filename: string) {
  function proxy(ipc: import('electron').IpcRenderer, f: (...args: any[]) => void, level: LogLevel) {
    return function (...args: any[]) {
      f(...args);
      function getErrorObject(){
        try { throw Error('') } catch(err) { return err; }
      }
      
      let origin = null;
      try {
        const err = getErrorObject();
        const caller_line = err.stack.split("\n")[3];
        const index = caller_line.indexOf("at ");
        origin = caller_line.slice(index+2, caller_line.length);
      } catch (e) {
        origin = filename;
      }

      writeToLog(ipc, `${origin}: ${args.map(x => JSON.stringify(x)).join(' ')}`, level);
    }
  }
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  console.log = proxy(ipc, originalLog, LogLevel.INFO);
  console.warn = proxy(ipc, originalWarn, LogLevel.WARN);
  console.error = proxy(ipc, originalError, LogLevel.ERROR);


  window.onerror = (_message, _file, _line, _column, errorObj) => {
    if (errorObj !== undefined) //so it won't blow up in the rest of the browsers
      console.error(errorObj.stack);

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
