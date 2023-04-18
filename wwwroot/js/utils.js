class Driver {
  /**
   * Represents a driver
   * @param {number} userId
   * @param {number} trackLength
   * @param {number} completedLaps
   */
  constructor(userId, trackLength, completedLaps) {
    this.userId = userId;
    this.trackLength = trackLength;
    this.points = [];
    this.bestLap = null;
    this.bestLapTime = null;
    this.bestLapTrustworthiness = 0;
    this.laptimes = []; // sorted
    this.completedLaps = completedLaps;

    this.crossedFinishLine = false;
    this.previousDistance = -1;
  }


  /**
   * The minimum amount of laps needed for the best lap to be considered trustworthy.
   */
  static get MIN_LAP_COUNT_FOR_TRUSTWORTHINESS() {
    return 2;
  }
  /**
   * The maximum deviation allowed within all laps for the best lap to be considered trustworthy.
   */
  static get MIN_TRUSTWORTHINESS_FOR_BEST_LAP() {
    return 0.982; // for example, [102, 101, 98.5] recieves a score of 0.985
  }

  get BEST_LAPS_FOR_DEVIATION() {
    return this.laptimes.slice(0, Driver.MIN_LAP_COUNT_FOR_TRUSTWORTHINESS);
  }


  /**
   * Add a point to the delta path.
   * @param {number} distance
   * @param {number} time
   * @param {number} completedLaps
   */
  addDeltaPoint(distance, time, completedLaps) {
    if (this.previousDistance != -1 && this.previousDistance - distance > this.trackLength / 2 && this.completedLaps == null) { // TODO: get rid of this when RR decides to fix its CompletedLaps value...
      this.points = [];
      this.crossedFinishLine = true;
    }
    this.previousDistance = distance;

    if (this.crossedFinishLine && (this.points.length == 0 || this.points[this.points.length - 1][0] != distance))
      this.points.push([distance, time]);

    this.completedLaps = completedLaps;
  }

  /**
   * End the current lap.
   * @param {number} laptime
   */
  endLap(laptime) {
    this.crossedFinishLine = true;
    if (this.points.length != 0) {
      laptime = this.points[this.points.length - 1][1] - this.points[0][1];
      if (laptime != null && laptime > 0) {
        this.laptimes.push(laptime);
        this.laptimes.sort((a, b) => a - b);
      }

      //                       number < null == false
      if ((laptime != null && laptime < this.bestLapTime) || this.bestLap == null) {
        this.bestLap = this.points;
        this.bestLapTime = laptime;
        if (laptime == null || this.laptimes.length < Driver.MIN_LAP_COUNT_FOR_TRUSTWORTHINESS) {
          this.bestLapTrustworthiness = 0;
        } else {
          this.bestLapTrustworthiness = 1 - standardDeviation(this.BEST_LAPS_FOR_DEVIATION) / average(this.BEST_LAPS_FOR_DEVIATION);
        }
      }
    }

    this.points = [];
  }

  /**
   * Get a relative delta to another driver (positions are based on the last delta points).
   * @param {Driver} driver
   * @param {boolean} includeLapDifference
   * @return {number} If `includeLapDifference` is true and the lap difference between the drivers is not 0,
   * the lap difference will be returned instead of the delta. Otherwise, the delta will be returned.
   */
  getDeltaToDriverAhead(driver, includeLapDifference = false) { // TODO: implement includeLapDifference
    const thisLapDistance = this.points[this.points.length - 1]?.[0];
    const otherLapDistance = driver.points[driver.points.length - 1]?.[0];

    if (thisLapDistance == null || otherLapDistance == null)
      return null;

    if (otherLapDistance < thisLapDistance) {
      const estimatedLapTime = this.getEstimatedLapTime();
      if (estimatedLapTime == null) {
        return null;
      }

      const delta = estimatedLapTime - driver.getDeltaToDriverAhead(this, includeLapDifference);
      if (delta < 0)
        return null;
    } else {
      if (this.bestLapTrustworthiness > Driver.MIN_TRUSTWORTHINESS_FOR_BEST_LAP) {
        return this.deltaBetweenPoints(thisLapDistance, otherLapDistance);
      }
      return driver.deltaBetweenPoints(thisLapDistance, otherLapDistance);
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
   * @return {number}
   */
  deltaBetweenPoints(point1, point2) {
    let lapData = this.points;
    if (this.bestLapTrustworthiness >= Driver.MIN_TRUSTWORTHINESS_FOR_BEST_LAP) {
      lapData = this.bestLap;
    }
    
    const point1Index = Driver.findClosestPointIndex(point1, lapData);
    const point2Index = Driver.findClosestPointIndex(point2, lapData);

    if (point1Index == null || point2Index == null)
      return null;

    let point1Time = lapData[point1Index][1];
    if (point1Index < lapData.length - 1) {
      const nextPointTime = lapData[point1Index + 1][1];
      const nextPointDistance = lapData[point1Index + 1][0];
      const pointDistance = lapData[point1Index][0];
      point1Time += (nextPointTime - point1Time) * (point1 - pointDistance) / (nextPointDistance - pointDistance);
    }
  
    let point2Time = lapData[point2Index][1];
    if (point2Index < lapData.length - 1) {
      const nextPointTime = lapData[point2Index + 1][1];
      const nextPointDistance = lapData[point2Index + 1][0];
      const pointDistance = lapData[point2Index][0];
      point2Time += (nextPointTime - point2Time) * (point2 - pointDistance) / (nextPointDistance - pointDistance);
    }

    return point2Time - point1Time;
  }


  static average = 0;
  static count = 0;

  /**
   * The index of the closest point to the given point which is also smaller than it.
   * @param {number} point
   * @param {number[]} points
   * @return {number}
   */
  static findClosestPointIndex(point, points) {
    let min = 0;
    let max = points.length - 1;
    let res;
    while (min <= max) {
      const mid = Math.floor((min + max) / 2);
      if (mid == 0 && points[mid][0] > point) {
        res = mid;
        break;
      }

      if (points[mid][0] < point) {
        min = mid + 1;
      } else if (points[mid][0] > point) {
        if (points[mid - 1][0] <= point) {
          res = mid - 1;
          break;
        }
        max = mid - 1;
      } else {
        res = mid;
        break;
      }
    }

    return res;
  }

  getEstimatedLapTime() {
    if (this.bestLapTime == null) {
      if (this.bestLap == null) {
        if (this.points.length == 0) {
          return null;
        }
        // Estimate lap time based on the average speed so far
        const totalDistance = this.points[this.points.length - 1][0];
        const totalTime = this.points[this.points.length - 1][1] - this.points[0][1];
        return totalTime / (totalDistance / this.trackLength);
      }
      // Get invalid lap time from the best lap
      return this.bestLap[this.bestLap.length - 1][1] - this.bestLap[0][1];
    }
    // Return the best lap time
    return this.bestLapTime;
  }
}

/**
 * Calculates the standard deviation of the given values.
 * @param {number[]} values
 * @return {number}
 */
function standardDeviation(values) {
  var avg = average(values);

  var squareDiffs = values.map(function(value) {
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
  var sum = data.reduce(function(sum, value) {
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}

