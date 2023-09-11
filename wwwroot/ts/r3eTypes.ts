export enum ESession {
    Unavailable = -1,
    Practice = 0,
    Qualify = 1,
    Race = 2,
    Warmup = 3
}

export enum ESessionPhase {
    Unavailable = -1,

    /** Currently in garage */
    Garage = 1,

    /** Gridwalk or track walkthrough */
    Gridwalk = 2,

    /** Formation lap, rolling start etc. */
    Formation = 3,

    /** Countdown to race is ongoing */
    Countdown = 4,

    /** Race is ongoing */
    Green = 5,

    /** End of session */
    Checkered = 6
}

export enum EControl {
    Unavailable = -1,

    /** Controlled by the actual player */
    Player = 0,

    /** Controlled by AI */
    AI = 1,

    /** Controlled by a network entity of some sort */
    Remote = 2,

    /** Controlled by a replay or ghost */
    Replay = 3
}

export enum EPitWindow {
    Unavailable = -1,

    /** Pit stops are not enabled for this session */
    Disabled = 0,

    /** Pit stops are enabled, but you're not allowed to perform one right now */
    Closed = 1,

    /** Allowed to perform a pit stop now */
    Open = 2,

    /** Currently performing the pit stop changes (changing driver, etc.) */
    Stopped = 3,

    /** After the current mandatory pitstop have been completed */
    Completed = 4
}

export enum PitStopStatus {
    /** No mandatory pitstops */
    Unavailable = -1,

    /** Mandatory pitstop not served yet */
    Unserved = 0,

    /** Mandatory pitstop served */
    Served = 1
}

export enum EFinishStatus {
    /** N/A */
    Unavailable = -1,

    /** Still on track, not finished */
    None = 0,

    /** Finished session normally */
    Finished = 1,

    /** Did not finish */
    DNF = 2,

    /** Did not qualify */
    DNQ = 3,

    /** Did not start */
    DNS = 4,

    /** Disqualified */
    DQ = 5
}

export enum ESessionLengthFormat {
    /** N/A */
    Unavailable = -1,

    TimeBased = 0,

    LapBased = 1,

    /** Time and lap based session means there will be an extra lap
     * after the time has run out */
    TimeAndLapBased = 2
}

export enum PitMenuSelection {
    // Pit menu unavailable
    Unavailable = -1,

    // Pit menu preset
    Preset = 0,

    // Pit menu actions
    Penalty = 1,
    Driverchange = 2,
    Fuel = 3,
    Fronttires = 4,
    Reartires = 5,
    Frontwing = 6,
    Rearwing = 7,
    Suspension = 8,

    // Pit menu buttons
    ButtonTop = 9,
    ButtonBottom = 10,

    // Pit menu nothing selected
    Max = 11
}

export enum ETireType {
    Unavailable = -1,
    Option = 0,
    Prime = 1
}

export enum ETireSubtype {
    Unavailable = -1,
    Primary = 0,
    Alternate = 1,
    Soft = 2,
    Medium = 3,
    Hard = 4
}

export enum EEngineType {
    Combustion = 0,
    Electric = 1,
    Hybrid = 2
}

export enum EPitState {
    None = -1,
    RequestedDtop = 1,
    Entered = 2,
    Pitting = 3,
    Exiting = 4
}

export enum EPenaltyType {
    Unavailable = -1,
    DriveThrough = 0,
    StopAndGo = 1,
    Pitstop = 2,
    Time = 3,
    Slowdown = 4,
    Disqualify = 5
}

export enum EOvertakingAid {
    Unavailable = -1,
    NotEngaged = 0,
    Engaged = 1
}

export interface IVector3 {
    x: number;
    y: number;
    z: number;
}

export interface IOrientation {
    pitch: number;
    yaw: number;
    roll: number;
}

export interface ISectorStarts {
    sector1: number;
    sector2: number;
    sector3: number;
}

export interface IPlayerData {
    /** Virtual physics time */
    /** unit: Ticks (1 tick = 1/400th of a second) */
    gameSimulationTicks: number;

    /** Virtual physics time */
    /** unit: Seconds */
    gameSimulationTime: number;

    /** Car world-space position */
    position: IVector3;

    /** Car world-space velocity */
    /** unit: Meter per second (m/s) */
    velocity: IVector3;

    /** Car local-space velocity */
    /** unit: Meter per second (m/s) */
    localVelocity: IVector3;

    /** Car world-space acceleration */
    /** unit: Meter per second squared (m/s^2) */
    acceleration: IVector3;

    /** Car local-space acceleration */
    /** unit: Meter per second squared (m/s^2) */
    localAcceleration: IVector3;

    /** Car body orientation */
    /** unit: Euler angles */
    orientation: IVector3;

    /** Car body rotation */
    rotation: IVector3;

    /** Car body angular acceleration (torque divided by inertia) */
    angularAcceleration: IVector3;

    /** Car world-space angular velocity */
    /** unit: Radians per second */
    angularVelocity: IVector3;

    /** Car local-space angular velocity */
    /** unit: Radians per second */
    localAngularVelocity: IVector3;

    /** Driver g-force local to car */
    localGforce: IVector3;

    /** Total steering force coming through steering bars */
    steeringForce: number;
    steeringForcePercentage: number;

    /** Current engine torque */
    engineTorque: number;

    /** Current downforce */
    /** unit: Newtons (N) */
    currentDownforce: number;

    /** Currently unused */
    voltage: number;
    ersLevel: number;
    powerMguH: number;
    powerMguK: number;
    torqueMguK: number;

    /** Car setup (radians, meters, meters per second) */
    suspensionDeflection: ITireData<number>;
    suspensionVelocity: ITireData<number>;
    camber: ITireData<number>;
    rideHeight: ITireData<number>;

    frontWingHeight: number;
    frontRollAngle: number;
    rearRollAngle: number;

    thirdSpringSuspensionDeflectionFront: number;
    thirdSpringSuspensionVelocityFront: number;
    thirdSpringSuspensionDeflectionRear: number;
    thirdSpringSuspensionVelocityRear: number;

    /** Reserved data */
    unused1: number;
}

export interface IFlags {
    /** Whether yellow flag is currently active */
    /** -1 = no data */
    /**  0 = not active */
    /**  1 = active */
    yellow: number;

    /** Whether yellow flag was caused by current slot */
    /** -1 = no data */
    /**  0 = didn't cause it */
    /**  1 = caused it */
    yellowCausedIt: number;

    /** Whether overtake of car in front by current slot is allowed */
    /** under yellow flag */
    /** -1 = no data */
    /**  0 = not allowed */
    /**  1 = allowed */
    yellowOvertake: number;

    /** Whether you have gained positions illegaly under yellow flag
     *  to give back */
    /** -1 = no data */
    /**  0 = no positions gained */
    /**  n = number of positions gained */
    yellowPositionsGained: number;

    /** Yellow flag for each sector; -1 = no data, 0 = not active, 1 = active */
    sectorYellow: ISectors;

    /** Distance into track for closest yellow, -1.0 if no yellow flag exists */
    /** unit: Meters (m) */
    closestYellowDistanceIntoTrack: number;

    /** Whether blue flag is currently active */
    /** -1 = no data */
    /**  0 = not active */
    /**  1 = active */
    blue: number;

    /** Whether black flag is currently active */
    /** -1 = no data */
    /**  0 = not active */
    /**  1 = active */
    black: number;

    /** Whether green flag is currently active */
    /** -1 = no data */
    /**  0 = not active */
    /**  1 = active */
    green: number;

    /** Whether checkered flag is currently active */
    /** -1 = no data */
    /**  0 = not active */
    /**  1 = active */
    checkered: number;

    /** Whether white flag is currently active */
    /** -1 = no data */
    /**  0 = not active */
    /**  1 = active */
    white: number;

    /** Whether black and white flag is currently active and reason */
    /** -1 = no data */
    /**  0 = not active */
    /**  1 = blue flag 1st warning */
    /**  2 = blue flag 2nd warning */
    /**  3 = wrong way */
    /**  4 = cutting track */
    blackAndWhite: number;
}

export interface ICarDamage {
    /** range: 0.0 - 1.0 */
    /** note: -1.0 = N/A */
    engine: number;

    /** range: 0.0 - 1.0 */
    /** note: -1.0 = N/A */
    transmission: number;

    /** range: 0.0 - 1.0 */
    /** note: A bit arbitrary at the moment. 0.0 doesn't necessarily mean
     * completely destroyed. */
    /** note: -1.0 = N/A */
    aerodynamics: number;

    /** range: 0.0 - 1.0 */
    /** note: -1.0 = N/A */
    suspension: number;

    /** Reserved data */
    unused1: number;
    unused2: number;
}

export interface ITireData<T> {
    frontLeft: T;
    frontRight: T;
    rearLeft: T;
    rearRight: T;
}

export interface IPitMenuSelection {
    // Pit menu preset
    preset: number;

    // Pit menu actions
    penalty: number;
    driverChange: number;
    fuel: number;
    frontTires: number;
    rearTires: number;
    frontWing: number;
    rearWing: number;
    suspension: number;

    // Pit menu buttons
    buttonTop: number;
    buttonBottom: number;
}

export interface ICutTrackPenalties {
    driveThrough: number;
    stopAndGo: number;
    pitStop: number;
    timeDeduction: number;
    slowDown: number;
}

export interface IDrs {
    /** If DRS is equipped and allowed */
    /** 0 = No, 1 = Yes, -1 = N/A */
    equipped: number;
    /** Got DRS activation left */
    /** 0 = No, 1 = Yes, -1 = N/A */
    available: number;
    /** Number of DRS activations left this lap */
    /** note: In sessions with 'endless' amount of drs activations per lap
     * this value starts at :max: number */
    /** -1 = N/A */
    numActivationsLeft: number;
    /** DRS engaged */
    /** 0 = No, 1 = Yes, -1 = N/A */
    engaged: number;
}

export interface IPushToPass {
    available: number;
    engaged: number;
    amountLeft: number;
    engagedTimeLeft: number;
    waitTimeLeft: number;
}

export interface ITireTemp {
    currentTemp: {
        left: number;
        center: number;
        right: number;
    };
    optimalTemp: number;
    coldTemp: number;
    hotTemp: number;
}

export interface IBrakeTemp {
    currentTemp: number;
    optimalTemp: number;
    coldTemp: number;
    hotTemp: number;
}

export interface IAidSettings {
    /** ABS; -1 = N/A, 0 = off, 1 = on, 5 = currently active */
    abs: number;
    /** TC; -1 = N/A, 0 = off, 1 = on, 5 = currently active */
    tc: number;
    /** ESP; -1 = N/A, 0 = off, 1 = on low, 2 = on medium, 3 = on high, */
    /** 5 = currently active */
    esp: number;
    /** Countersteer; -1 = N/A, 0 = off, 1 = on, 5 = currently active */
    countersteer: number;
    /** Cornering; -1 = N/A, 0 = off, 1 = on, 5 = currently active */
    cornering: number;
}

export interface ISectors {
    sector1: number;
    sector2: number;
    sector3: number;
}

export interface IDriverInfo {
    name: string;
    carNumber: number;
    classId: number;
    modelId: number;
    teamId: number;
    liveryId: number;
    manufacturerId: number;
    userId: number;
    slotId: number;
    classPerformanceIndex: number;
    engineType: EEngineType;

    carWidth: number;
    carLength: number;
}

export interface IDriverData {
    driverInfo: IDriverInfo;
    finishStatus: EFinishStatus;
    place: number;
    placeClass: number;
    lapDistance: number;
    position: IVector3;
    trackSector: number;
    completedLaps: number;
    currentLapValid: number;
    lapTimeCurrentSelf: number;
    sectorTimeCurrentSelf: ISectors;
    sectorTimePreviousSelf: ISectors;
    sectorTimeBestSelf: ISectors;
    timeDeltaFront: number;
    timeDeltaBehind: number;
    pitStopStatus: PitStopStatus;
    inPitlane: number;
    numPitstops: number;
    penalties: ICutTrackPenalties;
    carSpeed: number;
    tireTypeFront: ETireType;
    tireTypeRear: ETireType;
    tireSubtypeFront: ETireSubtype;
    tireSubtypeRear: ETireSubtype;

    basePenaltyWeight: number;
    aidPenaltyWeight: number;

    drsState: EOvertakingAid;
    ptpState: EOvertakingAid;
    penaltyType: EPenaltyType;

    // based on the PenaltyType you can assume the reason is:

    // DriveThroughPenaltyInvalid = 0,
    // DriveThroughPenaltyCutTrack = 1,
    // DriveThroughPenaltyPitSpeeding = 2,
    // DriveThroughPenaltyFalseStart = 3,
    // DriveThroughPenaltyIgnoredBlue = 4,
    // DriveThroughPenaltyDrivingTooSlow = 5,
    // DriveThroughPenaltyIllegallyPassedBeforeGreen = 6,
    // DriveThroughPenaltyIllegallyPassedBeforeFinish = 7,
    // DriveThroughPenaltyIllegallyPassedBeforePitEntrance = 8,
    // DriveThroughPenaltyIgnoredSlowDown = 9,
    // DriveThroughPenaltyMax = 10

    // StopAndGoPenaltyInvalid = 0,
    // StopAndGoPenaltyCutTrack1st = 1,
    // StopAndGoPenaltyCutTrackMult = 2,
    // StopAndGoPenaltyYellowFlagOvertake = 3,
    // StopAndGoPenaltyMax = 4

    // PitstopPenaltyInvalid = 0,
    // PitstopPenaltyIgnoredPitstopWindow = 1,
    // PitstopPenaltyMax = 2

    // ServableTimePenaltyInvalid = 0,
    // ServableTimePenaltyServedMandatoryPitstopLate = 1,
    // ServableTimePenaltyIgnoredMinimumPitstopDuration = 2,
    // ServableTimePenaltyMax = 3

    // SlowDownPenaltyInvalid = 0,
    // SlowDownPenaltyCutTrack1st = 1,
    // SlowDownPenaltyCutTrackMult = 2,
    // SlowDownPenaltyMax = 3

    // DisqualifyPenaltyInvalid = -1,
    // DisqualifyPenaltyFalseStart = 0,
    // DisqualifyPenaltyPitlaneSpeeding = 1,
    // DisqualifyPenaltyWrongWay = 2,
    // DisqualifyPenaltyEnteringPitsUnderRed = 3,
    // DisqualifyPenaltyExitingPitsUnderRed = 4,
    // DisqualifyPenaltyFailedDriverChange = 5,
    // DisqualifyPenaltyThreeDriveThroughsInLap = 6,
    // DisqualifyPenaltyLappedFieldMultipleTimes = 7,
    // DisqualifyPenaltyIgnoredDriveThroughPenalty = 8,
    // DisqualifyPenaltyIgnoredStopAndGoPenalty = 9,
    // DisqualifyPenaltyIgnoredPitStopPenalty = 10,
    // DisqualifyPenaltyIgnoredTimePenalty = 11,
    // DisqualifyPenaltyExcessiveCutting = 12,
    // DisqualifyPenaltyIgnoredBlueFlag = 13,
    // DisqualifyPenaltyMax = 14
    penaltyReason: number;

    engineState: number;
    
    orientation: IVector3;
}

export default interface IShared {
    //////////////////////////////////////////////////////////////////////////
    /** Version */
    //////////////////////////////////////////////////////////////////////////
    versionMajor: number;
    versionMinor: number;
    allDriversOffset: number /** Offset to NumCars variable */;
    driverDataSize: number /** Size of DriverData */;

    //////////////////////////////////////////////////////////////////////////
    /** Game State */
    //////////////////////////////////////////////////////////////////////////

    gamePaused: number;
    gameInMenus: number;
    gameInReplay: number;
    gameUsingVr: number;

    gameUnused1: number;

    //////////////////////////////////////////////////////////////////////////
    /** High Detail */
    //////////////////////////////////////////////////////////////////////////

    /** High precision data for player's vehicle only */
    player: IPlayerData;

    //////////////////////////////////////////////////////////////////////////
    /** Event And Session */
    //////////////////////////////////////////////////////////////////////////

    trackName: string;
    layoutName: string;

    trackId: number;
    layoutId: number;

    /** Layout length in meters */
    layoutLength: number;
    sectorStartFactors: ISectorStarts;

    /** The current race event index, for championships with multiple events
        note: 0-indexed, -1 = N/A */
    eventIndex: number;

    /** Which session the player is in (practice, qualifying, race, etc.) */
    sessionType: ESession;

    /** The current iteration of the current type of session
        (second qualifying session, etc.)
        note: 1-indexed, -1 = N/A */
    sessionIteration: number;

    /** If the session is time based, lap based or time based with
        an extra lap at the end */
    sessionLengthFormat: number;

    /** unit: Meter per second (m/s) */
    sessionPitSpeedLimit: number;

    /** Which phase the current session is in
     * (gridwalk, countdown, green flag, etc.) */
    sessionPhase: ESessionPhase;

    /** Which phase start lights are in; -1 = unavailable, 0 = off,
       1-5 = redlight on and counting down, 6 = greenlight on
       note: See the r3e_session_phase enum */
    startLights: ESessionPhase;

    /** -1 = no data available */
    /**  0 = not active */
    /**  1 = active */
    /**  2 = 2x */
    /**  3 = 3x */
    /**  4 = 4x */
    tireWearActive: number;

    /** -1 = no data */
    /**  0 = not active */
    /**  1 = active */
    /**  2 = 2x */
    /**  3 = 3x */
    /**  4 = 4x */
    fuelUseActive: number;

    /** Total number of laps in the race, or -1 if player is not in race mode
     * (practice, test mode, etc.) */
    numberOfLaps: number;

    /** Amount of time remaining for the current session */
    /** note: Only available in time-based sessions, -1.0 = N/A */
    /** units: Seconds */
    sessionTimeDuration: number;
    sessionTimeRemaining: number;

    /** Server max incident points, -1 = N/A */
    maxIncidentPoints: number;

    /** Reserved data */
    eventUnused2: number;

    //////////////////////////////////////////////////////////////////////////
    /** Pit */
    //////////////////////////////////////////////////////////////////////////

    /** Current status of the pit stop */
    pitWindowStatus: EPitWindow;

    /** The minute/lap from which you're obligated to pit (-1 = N/A) */
    /** unit: Minutes in time-based sessions, otherwise lap */
    pitWindowStart: number;

    /** The minute/lap into which you need to have pitted (-1 = N/A) */
    /** unit: Minutes in time-based sessions, otherwise lap */
    pitWindowEnd: number;

    /** If current vehicle is in pitline (-1 = N/A) */
    inPitlane: number;

    /** What is currently selected in pit menu, and array of states
     * (preset/buttons: -1 = not selectable,
     * 1 = selectable) (actions: -1 = N/A,
     * 0 = unmarked for fix,
     * 1 = marked for fix)
     * */
    pitMenuSelection: number;
    pitMenuState: IPitMenuSelection;

    /** current vehicle pit state:
     * -1 = N/A, 0 = None,
     *  1 = Requested stop,
     *	2 = Entered pitlane heading for pitspot,
     *	3 = Stopped at pitspot,
     *  4 = Exiting pitspot heading for pit exit)
     */
    pitState: EPitState;

    /** Current vehicle pitstop actions duration */
    pitTotalDuration: number;
    pitElapsedTime: number;

    /** current vehicle pit action: -1 = N/A,
     * 0 = None,
     * 1 = Preparing,
     * (combination of 2 = Penalty serve,
     * 4 = Driver change,
     * 8 = Refueling,
     * 16 = Front tires,
     * 32 = Rear tires,
     * 64 = Front wing,
     * 128 = Rear wing,
     * 256 = Suspension))
     */
    pitAction: number;

    /** Number of pitstops the current vehicle has performed (-1 = N/A) */
    numPitstopsPerformed: number;

    /** Pitstop with min duration (-1.0 = N/A, else seconds) */
    pitMinDurationTotal: number;
    pitMinDurationLeft: number;

    //////////////////////////////////////////////////////////////////////////
    /** Scoring & Timings */
    //////////////////////////////////////////////////////////////////////////

    /** The current state of each type of flag */
    flags: IFlags;

    /** Current position (1 = first place) */
    position: number;
    positionClass: number;

    finishStatus: EFinishStatus;

    /** Total number of cut track warnings (-1 = N/A) */
    cutTrackWarnings: number;

    /** The number of penalties the car currently has pending of
     * each type (-1 = N/A) */
    penalties: ICutTrackPenalties;
    /** Total number of penalties pending for the car */
    numPenalties: number;

    /** How many laps the player has completed. If this value is 6,
     * the player is on his 7th lap. -1 = n/a */
    completedLaps: number;
    currentLapValid: number;
    trackSector: number;
    lapDistance: number;
    /** fraction of lap completed, 0.0-1.0, -1.0 = N/A */
    lapDistanceFraction: number;

    /** The current best lap time for the leader of the session (-1.0 = N/A) */
    lapTimeBestLeader: number;
    /** The current best lap time for the leader of the player's class in
     * the current session (-1.0 = N/A) */
    lapTimeBestLeaderClass: number;
    /** Sector times of fastest lap by anyone in session */
    /** unit: Seconds (-1.0 = N/A) */
    sectorTimesSessionBestLap: ISectors;
    /** unit: Seconds (-1.0 = none) */
    lapTimeBestSelf: number;
    sectorTimesBestSelf: ISectors;
    /** unit: Seconds (-1.0 = none) */
    lapTimePreviousSelf: number;
    sectorTimesPreviousSelf: ISectors;
    /** unit: Seconds (-1.0 = none) */
    lapTimeCurrentSelf: number;
    sectorTimesCurrentSelf: ISectors;
    /** The time delta between the player's time and the leader of the
     * current session (-1.0 = N/A) */
    lapTimeDeltaLeader: number;
    /** The time delta between the player's time and the leader of the
     * player's class in the current session (-1.0 = N/A) */
    lapTimeDeltaLeaderClass: number;
    /** Time delta between the player and the car placed in front (-1.0 = N/A) */
    /** units: Seconds */
    timeDeltaFront: number;
    /** Time delta between the player and the car placed behind (-1.0 = N/A) */
    /** units: Seconds */
    timeDeltaBehind: number;
    // Time delta between this car's current laptime and this car's best laptime
    // unit: Seconds (-1000.0 = N/A)
    timeDeltaBestSelf: number;
    // Best time for each individual sector no matter lap
    // unit: Seconds (-1.0 = N/A)
    bestIndividualSectorTimeSelf: ISectors;
    bestIndividualSectorTimeLeader: ISectors;
    bestIndividualSectorTimeLeaderClass: ISectors;
    incidentPoints: number;

    /** Reserved data */
    scoreUnused1: number;
    scoreUnused2: number;
    scoreUnused3: number;

    //////////////////////////////////////////////////////////////////////////
    /** Vehicle information */
    //////////////////////////////////////////////////////////////////////////

    vehicleInfo: IDriverInfo;
    playerName: string;

    //////////////////////////////////////////////////////////////////////////
    /** Vehicle State */
    //////////////////////////////////////////////////////////////////////////

    /** Which controller is currently controlling the player's car
     *  (AI, player, remote, etc.) */
    controlType: EControl;

    /** unit: Meter per second (m/s) */
    carSpeed: number;

    /** unit: Radians per second (rad/s) */
    engineRps: number;
    maxEngineRps: number;
    upshiftRps: number;

    /** -2 = N/A, -1 = reverse, 0 = neutral, 1 = first gear, ... */
    gear: number;
    /** -1 = N/A */
    numGears: number;

    /** Physical location of car's center of gravity in world space
     *  (X, Y, Z) (Y = up) */
    carCgLocation: IVector3;
    /** Pitch, yaw, roll */
    /** unit: Radians (rad) */
    carOrientation: IOrientation;
    /** Acceleration in three axes (X, Y, Z) of car body in local-space. */
    /** From car center, +X=left, +Y=up, +Z=back. */
    /** unit: Meter per second squared (m/s^2) */
    localAcceleration: IVector3;

    // unit: Kilograms (kg)
    // note: Car + penalty weight + fuel
    totalMass: number;
    /** unit: Liters (l) */
    /** note: Fuel per lap show estimation when not enough data,
     * then max recorded fuel per lap */
    /** note: Not valid for remote players */
    fuelLeft: number;
    fuelCapacity: number;
    fuelPerLap: number;

    /** unit: Celsius (C) */
    /** note: Not valid for AI or remote players */
    engineWaterTemp: number;
    engineOilTemp: number;
    /** unit: Kilopascals (KPa) */
    /** note: Not valid for AI or remote players */
    fuelPressure: number;
    /** unit: Kilopascals (KPa) */
    /** note: Not valid for AI or remote players */
    engineOilPressure: number;

    /** unit: (Bar) */
    /** note: Not valid for AI or remote players (-1.0 = N/A) */
    turboPressure: number;

    /** How pressed the throttle pedal is */
    /** range: 0.0 - 1.0 (-1.0 = N/A) */
    /** note: Not valid for AI or remote players */
    throttle: number;
    throttleRaw: number;
    /** How pressed the brake pedal is */
    /** range: 0.0 - 1.0 (-1.0 = N/A) */
    /** note: Not valid for AI or remote players */
    brake: number;
    brakeRaw: number;
    /** How pressed the clutch pedal is */
    /** range: 0.0 - 1.0 (-1.0 = N/A) */
    /** note: Not valid for AI or remote players */
    clutch: number;
    clutchRaw: number;
    /** How much the steering wheel is turned */
    /** range: -1.0 - 1.0 */
    /** note: Not valid for AI or remote players */
    steerInputRaw: number;
    /** How many degrees in steer lock (center to full lock) */
    /** note: Not valid for AI or remote players */
    steerLockDegrees: number;
    /** How many degrees in wheel range (degrees full left to rull right) */
    /** note: Not valid for AI or remote players */
    steerWheelRangeDegrees: number;

    /** Aid settings */
    aidSettings: IAidSettings;

    /** DRS data */
    drs: IDrs;

    /** Pit limiter (-1 = N/A, 0 = inactive, 1 = active) */
    pitLimiter: number;

    /** Push to pass data */
    pushToPass: IPushToPass;

    /** How much the vehicle's brakes are biased towards the back wheels
     * (0.3 = 30%, etc.) (-1.0 = N/A) */
    /** note: Not valid for AI or remote players */
    brakeBias: number;

    /** DRS activations available in total (-1 = N/A or endless)
     */
    drsNumActivationsTotal: number;

    /** PTP activations available in total
     * (-1 = N/A, or there's no restriction per lap, or endless)
     */
    ptpNumActivationsTotal: number;

    /** Reserved data */
    vehicleUnused1: number;
    vehicleUnused2: number;
    vehicleUnused3: IOrientation;

    //////////////////////////////////////////////////////////////////////////
    /** Tires */
    //////////////////////////////////////////////////////////////////////////

    /** Rotation speed */
    /** uint: Radians per second */
    tireRps: ITireData<number>;
    /** Wheel speed */
    /** uint: Meters per second */
    tireSpeed: ITireData<number>;
    /** range: 0.0 - 1.0 (-1.0 = N/A) */
    tireGrip: ITireData<number>;
    /** range: 0.0 - 1.0 (-1.0 = N/A) */
    tireWear: ITireData<number>;
    // (-1 = N/A, 0 = false, 1 = true)
    tireFlatspot: ITireData<number>;
    /** unit: Kilopascals (KPa) (-1.0 = N/A) */
    /** note: Not valid for AI or remote players */
    tirePressure: ITireData<number>;
    /** Percentage of dirt on tire (-1.0 = N/A) */
    /** range: 0.0 - 1.0 */
    tireDirt: ITireData<number>;
    /** Current temperature of three points across the tread
    of the tire (-1.0 = N/A) */
    /** Optimum temperature */
    /** Cold temperature */
    /** Hot temperature */
    tireTemp: ITireData<ITireTemp>;

    /** Which type of tires the car has (option, prime, etc.) */
    tireTypeFront: ETireType;
    tireTypeRear: ETireType;

    /** Which subtype of tires the car has */
    tireSubtypeFront: ETireSubtype;
    tireSubtypeRear: ETireSubtype;

    /** Current brake temperature (-1.0 = N/A) */
    /** Optimum temperature */
    /** Cold temperature */
    /** Hot temperature */
    /** unit: Celsius (C) */
    /** note: Not valid for AI or remote players */
    brakeTemp: ITireData<IBrakeTemp>;

    /** Brake pressure (-1.0 = N/A) */
    /** unit: Kilo Newtons (kN) */
    /** note: Not valid for AI or remote players */
    brakePressure: ITireData<number>;

    //////////////////////////////////////////////////////////////////////////
    /** Electronics */
    //////////////////////////////////////////////////////////////////////////

    // -1 = N/A
    tractionControlSetting: number;
    engineMapSetting: number;
    engineBrakeSetting: number;

    /** Reserved data */

    tireUnused1: number;
    tireUnused2: ITireData<number>;

    // Tire load (N)
    // -1.0 = N/A
    tireLoad: ITireData<number>;
    //////////////////////////////////////////////////////////////////////////
    /** Damage */
    //////////////////////////////////////////////////////////////////////////

    /** The current state of various parts of the car */
    /** note: Not valid for AI or remote players */
    carDamage: ICarDamage;

    //////////////////////////////////////////////////////////////////////////
    /** Driver Info */
    //////////////////////////////////////////////////////////////////////////

    /** Number of cars (including the player) in the race */
    numCars: number;

    /** Contains name and basic vehicle info for all drivers in place order */
    driverData: IDriverData[];
}