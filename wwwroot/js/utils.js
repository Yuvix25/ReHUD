class DeltaManager {
  static DELTA_WINDOW = 10; // seconds
  static DELTA_OF_DELTA_MULTIPLIER = 1.5; // seconds
  static deltaWindow = [];

  /**
   * Add a delta to the delta window.
   * @param {number} delta
   */
  static addDelta(delta) {
    const time = new Date().getTime() / 1000;
    DeltaManager.deltaWindow.push([time, delta]);
    while (DeltaManager.deltaWindow[0][0] < time - DeltaManager.DELTA_WINDOW)
      DeltaManager.deltaWindow.shift();
  }

  static getLastDelta() {
    if (DeltaManager.deltaWindow.length == 0)
      return null;
    return DeltaManager.deltaWindow[DeltaManager.deltaWindow.length - 1];
  }

  /**
   * Get some sort of delta of the delta itself during the window.
   * @return {number}
   */
  static getDeltaOfDeltas() {
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
    // return DeltaManager.deltaWindow[DeltaManager.deltaWindow.length - 1][1] - DeltaManager.deltaWindow[0][1];
  }

  /**
   * Clear the delta window.
   */
  static clear() {
    DeltaManager.deltaWindow = [];
  }
}

class Driver {
  static pointsPerMeter = 0.5;
  static positionJumpThreshold = 150; // meters

  /**
   * @type {Driver}
   */
  static mainDriver = null;

  /**
   * Represents a driver
   * @param {number} userId
   * @param {number} trackLength
   * @param {number} completedLaps
   */
  constructor(userId, trackLength, completedLaps) {
    this.userId = userId;
    this.trackLength = trackLength;
    this.points = this.newPointArray(); // points[distance] = time
    this.currentIndex = -1;
    this.currentLapValid = true;
    this.bestLap = null;
    this.bestLapTime = null;
    this.bestLapTimeValid = false;
    this.completedLaps = completedLaps;

    this.crossedFinishLine = false;
    this.previousDistance = -1;
  }

  /**
   * Sets the main driver (the one currently being viewed)
   * @param {Driver} driver
   */
  static setMainDriver(driver) {
    Driver.mainDriver = driver;
  }

  /**
   * Sets the main driver to this driver.
   */
  setAsMainDriver() {
    Driver.setMainDriver(this);
  }

  /**
   * Initializes a new point array.
   * @return {Array.<null>}
   */
  newPointArray() {
    return Array(Math.floor(this.trackLength * Driver.pointsPerMeter)).fill(null);
  }


  /**
   * Erases the temporary data of the driver.
   * @param {number} distance - The current distance of the driver.
   */
  clearTempData(distance=null) {
    this.crossedFinishLine = false;
    this.currentLapValid = false;
    this.currentIndex = distance == null ? -1 : Math.min(Math.floor(distance * Driver.pointsPerMeter), this.points.length - 1);
    this.points = this.newPointArray();
  }


  /**
   * Add a point to the delta path.
   * MUST BE CALLED AFTER `endLap` IF THE LAP IS COMPLETED.
   * @param {number} distance
   * @param {number} completedLaps
   */
  addDeltaPoint(distance, completedLaps) {
    const time = new Date().getTime() / 1000;

    if (this.previousDistance != -1 && this.previousDistance - distance > this.trackLength / 2 && this.completedLaps == null) { // TODO: get rid of this when RR decides to fix its CompletedLaps value...
      this.crossedFinishLine = true;
    } else if (this.completedLaps == completedLaps && Math.abs(this.previousDistance - distance) > Driver.positionJumpThreshold) {
      // jump in position detected, which is not a lap completion
      this.clearTempData(distance);
    }
    
    const gapToSpot = distance * Driver.pointsPerMeter - this.currentIndex;
    if (gapToSpot >= 0) {
      for (let i = 0; i < gapToSpot; i++) {
        this.points[++this.currentIndex] = time;
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
   * @param {number} laptime
   */
  endLap(laptime) {
    const time = new Date().getTime() / 1000;

    for (let i = this.currentIndex + 1; i < this.points.length; i++) {
      this.points[i] = this.points[this.currentIndex];
    }
    this.currentIndex = -1;

    if (this.crossedFinishLine) {
      laptime == null && (laptime = time - this.points[0]);

      //                       number < null == false
      if (this.completedLaps >= 0 && (this.bestLapTime == null || !this.bestLapTimeValid || laptime < this.bestLapTime)) {
        this.bestLap = this.points.slice();
        this.bestLapTime = laptime;
      }
    }

    this.crossedFinishLine = true;
    this.currentLapValid = true;
  }

  /**
   * Get a relative delta to another driver (positions are based on the last delta points).
   * @param {Driver} driver
   * @param {boolean} includeLapDifference
   * @return {number} If `includeLapDifference` is true and the lap difference between the drivers is not 0,
   * the lap difference will be returned instead of the delta. Otherwise, the delta will be returned.
   */
  getDeltaToDriverAhead(driver, includeLapDifference = false) { // TODO: implement includeLapDifference
    const thisLapDistance = this.currentIndex;
    const otherLapDistance = driver.currentIndex;

    if (thisLapDistance == null || otherLapDistance == null)
      return null;

    if (otherLapDistance < thisLapDistance) {
      let res;
      const estimatedLapTime = this.getEstimatedLapTime() || driver.getEstimatedLapTime();

      if ((Driver.mainDriver === this || Driver.mainDriver === driver) && estimatedLapTime != null) {
        res = estimatedLapTime - Driver.mainDriver.deltaBetweenPoints(thisLapDistance, otherLapDistance, true, false);
        if (res != null && res >= 0)
          return res;
      }

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

  getDeltaToDriverBehind(driver, includeLapDifference = false) {
    return driver.getDeltaToDriverAhead(this, includeLapDifference);
  }

  /**
   * The delta between two points on the track (distances).
   * Calculated using either the current lap or the best lap.
   * @param {number} point1
   * @param {number} point2
   * @param {boolean} [useBestLap=true]
   * @param {boolean} [fallbackToCurrentLap=true]
   * @return {number}
   */
  deltaBetweenPoints(point1, point2, useBestLap = true, fallbackToCurrentLap = true) {
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
   * @param {Driver} driver
   * @return {number}
   */
  getDistanceToDriverAhead(driver) {
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
   * @param {Driver} driver
   * @return {number}
   */
  getDistanceToDriverBehind(driver) {
    return driver.getDistanceToDriverAhead(this);
  }


  static average = 0;
  static count = 0;

  getEstimatedLapTime() {
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


/**
 * @param {object} driverInfo - DriverData[x].DriverInfo
 * @return {string} - Unique ID for the driver (JSON of some fields)
 */
function getUid(driverInfo) {
  const obj = {
    name: driverInfo.name,
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
 * @param {number[]} values
 * @return {number}
 */
function standardDeviation(values) {
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
 * @param {number[]} data
 * @return {number}
 */
function average(data) {
  var sum = data.reduce(function (sum, value) {
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}


/**
 * @typedef {{x: number, y: number, z: number}} Vector
 */

/**
 * @param {Vector} a
 * @param {Vector} b
 * @return {Vector}
 */
function vectorSubtract(a, b) {
  const res = {};
  for (const key in a) {
    res[key] = a[key] - b[key];
  }
  return res;
}

/**
 * @param {Vector} a
 * @return {Vector}
 */
function distanceFromZero(a) {
  return Math.sqrt(a.x ** 2 + a.z ** 2);
}

/**
 * Get a rotation matrix from the given eular angles - inverted.
 * @param {Vector} eular
 * @return {Array.<Array.<number>>}
 */
function rotationMatrixFromEular(eular) {
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
 * @param {Object} matrix 
 * @param {Vector} vector
 * @return {Vector}
 */
function rotateVector(matrix, vector) {
  return {
    x: matrix[0][0] * vector.x + matrix[0][1] * vector.y + matrix[0][2] * vector.z,
    y: matrix[1][0] * vector.x + matrix[1][1] * vector.y + matrix[1][2] * vector.z,
    z: matrix[2][0] * vector.x + matrix[2][1] * vector.y + matrix[2][2] * vector.z,
  };
}


function mpsToKph(mps) {
  return mps * 3.6;
}



class AudioController {
  audio = new Audio();
  audioIsPlaying = false;
  audioContext = new AudioContext();
  mediaSource = this.audioContext.createMediaElementSource(this.audio);
  stereoPanner = this.audioContext.createStereoPanner();

  constructor({ minPlaybackRate = 0.1, maxPlaybackRate = 10, playbackRateMultiplier = 2, volumeMultiplier = 1 } = {}) {
    this.minPlaybackRate = minPlaybackRate;
    this.maxPlaybackRate = maxPlaybackRate;
    this.playbackRateMultiplier = playbackRateMultiplier;
    this.volumeMultiplier = volumeMultiplier;

    this.mediaSource.connect(this.stereoPanner);
    this.stereoPanner.connect(this.audioContext.destination);

    this.audio.src = '/sounds/beep.wav';
    // this.audio.loop = true;

    this.audio.onplaying = () => {
      this.audioIsPlaying = true;
    };
    this.audio.onended = () => {
      this.audioIsPlaying = false;
    };
  }

  setVolume(volume) {
    this.volumeMultiplier = volume;
  }

  /**
   * @param {number} amount - Controls the volume and playback rate of the audio (higher = louder and faster)
   * @param {number} pan - Controls the panning of the audio (negative = left, positive = right), between -1 and 1
   */
  play(amount, pan) {
    this.audio.volume = Math.max(0, Math.min(1, amount / 10 * this.volumeMultiplier));
    this.audio.playbackRate = Math.min(Math.max(this.minPlaybackRate, amount * this.playbackRateMultiplier), this.maxPlaybackRate);
    this.stereoPanner.pan.value = pan;

    if (this.audio.paused && this.audioContext.state !== 'suspended' && !this.audioIsPlaying) {
      this.audio.play().catch(() => { });
    }
  }
}

const INFO = 'INFO';
const WARN = 'WARN';
const ERROR = 'ERROR';

function writeToLog(ipc, message, level = INFO) {
  ipc.send('log', { message, level });
}


function enableLogging(ipc, filename) {
  function proxy(ipc, f, level) {
    return function (...args) {
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
  console.log = proxy(ipc, originalLog, INFO);
  console.warn = proxy(ipc, originalWarn, WARN);
  console.error = proxy(ipc, originalError, ERROR);


  window.onerror = (message, file, line, column, errorObj) => {
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


// const { contextBridge } = require('electron')


// contextBridge.exposeInMainWorld('utils', {
//   Driver,
//   vectorSubtract,
//   distanceFromZero,
//   rotationMatrixFromEular,
//   rotateVector,
//   mpsToKph,
//   AudioController,
//   writeToLog,
//   enableLogging,
//   INFO,
//   WARN,
//   ERROR
// });

