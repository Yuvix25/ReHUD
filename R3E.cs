using System.Runtime.InteropServices;

namespace R3E
{
    class Constant
    {
        public const string sharedMemoryName = "$R3E";

        enum VersionMajor
        {
            // Major version number to test against
            R3E_VERSION_MAJOR = 2
        };

        enum VersionMinor
        {
            // Minor version number to test against
            R3E_VERSION_MINOR = 14
        };

        enum Session
        {
            Unavailable = -1,
            Practice = 0,
            Qualify = 1,
            Race = 2,
            Warmup = 3,
        };

        enum SessionPhase
        {
            Unavailable = -1,

            // Currently in garage
            Garage = 1,

            // Gridwalk or track walkthrough
            Gridwalk = 2,

            // Formation lap, rolling start etc.
            Formation = 3,

            // Countdown to race is ongoing
            Countdown = 4,

            // Race is ongoing
            Green = 5,

            // End of session
            Checkered = 6,
        };

        enum Control
        {
            Unavailable = -1,

            // Controlled by the actual player
            Player = 0,

            // Controlled by AI
            AI = 1,

            // Controlled by a network entity of some sort
            Remote = 2,

            // Controlled by a replay or ghost
            Replay = 3,
        };

        enum PitWindow
        {
            Unavailable = -1,

            // Pit stops are not enabled for this session
            Disabled = 0,

            // Pit stops are enabled, but you're not allowed to perform one right now
            Closed = 1,

            // Allowed to perform a pit stop now
            Open = 2,

            // Currently performing the pit stop changes (changing driver, etc.)
            Stopped = 3,

            // After the current mandatory pitstop have been completed
            Completed = 4,
        };

        enum PitStopStatus
        {
            // No mandatory pitstops
            Unavailable = -1,

            // Mandatory pitstop for two tyres not served yet
            UnservedTwoTyres = 0,

            // Mandatory pitstop for four tyres not served yet
            UnservedFourTyres = 1,

            // Mandatory pitstop served
            Served = 2,
        };

        enum FinishStatus
        {
            // N/A
            Unavailable = -1,

            // Still on track, not finished
            None = 0,

            // Finished session normally
            Finished = 1,

            // Did not finish
            DNF = 2,

            // Did not qualify
            DNQ = 3,

            // Did not start
            DNS = 4,

            // Disqualified
            DQ = 5,
        };

        enum SessionLengthFormat
        {
            // N/A
            Unavailable = -1,

            TimeBased = 0,

            LapBased = 1,

            // Time and lap based session means there will be an extra lap after the time has run out
            TimeAndLapBased = 2
        };

        enum PitMenuSelection
        {
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
        };

        enum TireType
        {
            Unavailable = -1,
            Option = 0,
            Prime = 1,
        };

        enum TireSubtype
        {
            Unavailable = -1,
            Primary = 0,
            Alternate = 1,
            Soft = 2,
            Medium = 3,
            Hard = 4
        };

        enum MtrlType
        {
            Unavailable = -1,
            None = 0,
            Tarmac = 1,
            Grass = 2,
            Dirt = 3,
            Gravel = 4,
            Rumble = 5
        };

        enum EngineType
        {
            COMBUSTION = 0,
            ELECTRIC = 1,
            HYBRID = 2,
        };
    }

    namespace Data
    {
        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct RaceDuration<T>
        {
            public T race1;
            public T race2;
            public T race3;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct Vector3<T>
        {
            public T x;
            public T y;
            public T z;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct Orientation<T>
        {
            public T pitch;
            public T yaw;
            public T roll;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct SectorStarts<T>
        {
            public T sector1;
            public T sector2;
            public T sector3;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct PlayerData
        {
            // Virtual physics time
            // Unit: Ticks (1 tick = 1/400th of a second)
            public Int32 gameSimulationTicks;

            // Virtual physics time
            // Unit: Seconds
            public Double gameSimulationTime;

            // Car world-space position
            public Vector3<Double> position;

            // Car world-space velocity
            // Unit: Meter per second (m/s)
            public Vector3<Double> velocity;

            // Car local-space velocity
            // Unit: Meter per second (m/s)
            public Vector3<Double> localVelocity;

            // Car world-space acceleration
            // Unit: Meter per second squared (m/s^2)
            public Vector3<Double> acceleration;

            // Car local-space acceleration
            // Unit: Meter per second squared (m/s^2)
            public Vector3<Double> localAcceleration;

            // Car body orientation
            // Unit: Euler angles
            public Vector3<Double> orientation;

            // Car body rotation
            public Vector3<Double> rotation;

            // Car body angular acceleration (torque divided by inertia)
            public Vector3<Double> angularAcceleration;

            // Car world-space angular velocity
            // Unit: Radians per second
            public Vector3<Double> angularVelocity;

            // Car local-space angular velocity
            // Unit: Radians per second
            public Vector3<Double> localAngularVelocity;

            // Driver g-force local to car
            public Vector3<Double> localGforce;

            // Total steering force coming through steering bars
            public Double steeringForce;
            public Double steeringForcePercentage;

            // Current engine torque
            public Double engineTorque;

            // Current downforce
            // Unit: Newtons (N)
            public Double currentDownforce;

            // Currently unused
            public Double voltage;
            public Double ersLevel;
            public Double powerMguH;
            public Double powerMguK;
            public Double torqueMguK;

            // Car setup (radians, meters, meters per second)
            public TireData<Double> suspensionDeflection;
            public TireData<Double> suspensionVelocity;
            public TireData<Double> camber;
            public TireData<Double> rideHeight;
            public Double frontWingHeight;
            public Double frontRollAngle;
            public Double rearRollAngle;
            public Double thirdSpringSuspensionDeflectionFront;
            public Double thirdSpringSuspensionVelocityFront;
            public Double thirdSpringSuspensionDeflectionRear;
            public Double thirdSpringSuspensionVelocityRear;

            // Reserved data
            public Double unused1;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct Flags
        {
            // Whether yellow flag is currently active
            // -1 = no data
            //  0 = not active
            //  1 = active
            public Int32 yellow;

            // Whether yellow flag was caused by current slot
            // -1 = no data
            //  0 = didn't cause it
            //  1 = caused it
            public Int32 yellowCausedIt;

            // Whether overtake of car in front by current slot is allowed under yellow flag
            // -1 = no data
            //  0 = not allowed
            //  1 = allowed
            public Int32 yellowOvertake;

            // Whether you have gained positions illegaly under yellow flag to give back
            // -1 = no data
            //  0 = no positions gained
            //  n = number of positions gained
            public Int32 yellowPositionsGained;

            // Yellow flag for each sector; -1 = no data, 0 = not active, 1 = active
            public Sectors<Int32> sectorYellow;

            // Distance into track for closest yellow, -1.0 if no yellow flag exists
            // Unit: Meters (m)
            public Single closestYellowDistanceIntoTrack;

            // Whether blue flag is currently active
            // -1 = no data
            //  0 = not active
            //  1 = active
            public Int32 blue;

            // Whether black flag is currently active
            // -1 = no data
            //  0 = not active
            //  1 = active
            public Int32 black;

            // Whether green flag is currently active
            // -1 = no data
            //  0 = not active
            //  1 = active
            public Int32 green;

            // Whether checkered flag is currently active
            // -1 = no data
            //  0 = not active
            //  1 = active
            public Int32 checkered;

            // Whether white flag is currently active
            // -1 = no data
            //  0 = not active
            //  1 = active
            public Int32 white;

            // Whether black and white flag is currently active and reason
            // -1 = no data
            //  0 = not active
            //  1 = blue flag 1st warnings
            //  2 = blue flag 2nd warnings
            //  3 = wrong way
            //  4 = cutting track
            public Int32 blackAndWhite;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct CarDamage
        {
            // Range: 0.0 - 1.0
            // Note: -1.0 = N/A
            public Single engine;

            // Range: 0.0 - 1.0
            // Note: -1.0 = N/A
            public Single transmission;

            // Range: 0.0 - 1.0
            // Note: A bit arbitrary at the moment. 0.0 doesn't necessarily mean completely destroyed.
            // Note: -1.0 = N/A
            public Single aerodynamics;

            // Range: 0.0 - 1.0
            // Note: -1.0 = N/A
            public Single suspension;

            // Reserved data
            public Single unused1;
            public Single unused2;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct TireData<T>
        {
            public T frontLeft;
            public T frontRight;
            public T rearLeft;
            public T rearRight;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct PitMenuState
        {
            // Pit menu preset
            public Int32 preset;

            // Pit menu actions
            public Int32 penalty;
            public Int32 driverchange;
            public Int32 fuel;
            public Int32 frontTires;
            public Int32 rearTires;
            public Int32 frontWing;
            public Int32 rearWing;
            public Int32 suspension;

            // Pit menu buttons
            public Int32 buttonTop;
            public Int32 buttonBottom;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct CutTrackPenalties
        {
            public Int32 driveThrough;
            public Int32 stopAndGo;
            public Int32 pitStop;
            public Int32 timeDeduction;
            public Int32 slowDown;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct DRS
        {
            // If DRS is equipped and allowed
            // 0 = No, 1 = Yes, -1 = N/A
            public Int32 equipped;
            // Got DRS activation left
            // 0 = No, 1 = Yes, -1 = N/A
            public Int32 available;
            // Number of DRS activations left this lap
            // Note: In sessions with 'endless' amount of drs activations per lap this value starts at int32::max
            // -1 = N/A
            public Int32 numActivationsLeft;
            // DRS engaged
            // 0 = No, 1 = Yes, -1 = N/A
            public Int32 engaged;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct PushToPass
        {
            public Int32 available;
            public Int32 engaged;
            public Int32 amountLeft;
            public Single engagedTimeLeft;
            public Single waitTimeLeft;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct TireTempInformation
        {
            public TireTemperature<Single> currentTemp;
            public Single optimalTemp;
            public Single coldTemp;
            public Single hotTemp;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct BrakeTemp
        {
            public Single currentTemp;
            public Single optimalTemp;
            public Single coldTemp;
            public Single hotTemp;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct TireTemperature<T>
        {
            public T left;
            public T center;
            public T right;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct AidSettings
        {
            // ABS; -1 = N/A, 0 = off, 1 = on, 5 = currently active
            public Int32 abs;
            // TC; -1 = N/A, 0 = off, 1 = on, 5 = currently active
            public Int32 tc;
            // ESP; -1 = N/A, 0 = off, 1 = on low, 2 = on medium, 3 = on high, 5 = currently active
            public Int32 esp;
            // Countersteer; -1 = N/A, 0 = off, 1 = on, 5 = currently active
            public Int32 countersteer;
            // Cornering; -1 = N/A, 0 = off, 1 = on, 5 = currently active
            public Int32 cornering;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct Sectors<T>
        {
            public T sector1;
            public T sector2;
            public T sector3;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct DriverInfo
        {
            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 64)]
            public byte[] name; // UTF-8
            public Int32 carNumber;
            public Int32 classId;
            public Int32 modelId;
            public Int32 teamId;
            public Int32 liveryId;
            public Int32 manufacturerId;
            public Int32 userId;
            public Int32 slotId;
            public Int32 classPerformanceIndex;
            // Note: See the EngineType enum
            public Int32 engineType;
            public Single carWidth;
            public Single carLength;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct DriverData
        {
            public DriverInfo driverInfo;
            // Note: See the R3E.Constant.FinishStatus enum
            public Int32 finishStatus;
            public Int32 place;
            // Based on performance index
            public Int32 placeClass;
            public Single lapDistance;
            public Vector3<Single> position;
            public Int32 trackSector;
            public Int32 completedLaps;
            public Int32 currentLapValid;
            public Single lapTimeCurrentSelf;
            public Sectors<Single> sectorTimeCurrentSelf;
            public Sectors<Single> sectorTimePreviousSelf;
            public Sectors<Single> sectorTimeBestSelf;
            public Single timeDeltaFront;
            public Single timeDeltaBehind;
            // Note: See the R3E.Constant.PitStopStatus enum
            public Int32 pitStopStatus;
            public Int32 inPitlane;

            public Int32 numPitstops;

            public CutTrackPenalties penalties;

            public Single carSpeed;
            // Note: See the R3E.Constant.TireType enum
            public Int32 tireTypeFront;
            public Int32 tireTypeRear;
            // Note: See the R3E.Constant.TireSubtype enum
            public Int32 tireSubtypeFront;
            public Int32 tireSubtypeRear;

            public Single basePenaltyWeight;
            public Single aidPenaltyWeight;

            // -1 unavailable, 0 = not engaged, 1 = engaged
            public Int32 drsState;
            public Int32 ptpState;

            // -1 unavailable, DriveThrough = 0, StopAndGo = 1, Pitstop = 2, Time = 3, Slowdown = 4, Disqualify = 5,
            public Int32 penaltyType;

            // Based on the PenaltyType you can assume the reason is:

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
            public Int32 penaltyReason;
	
            // -1 unavailable, 0 = ignition off, 1 = ignition on but not running, 2 = ignition on and running
            public Int32 engineState;

            // Car body orientation
            // Unit: Euler angles
            public Vector3<Single> orientation;
        }

        [StructLayout(LayoutKind.Sequential, Pack = 1)]
        internal struct Shared
        {
            //////////////////////////////////////////////////////////////////////////
            // Version
            //////////////////////////////////////////////////////////////////////////
            public Int32 versionMajor;
            public Int32 versionMinor;
            public Int32 allDriversOffset; // Offset to NumCars variable
            public Int32 driverDataSize; // Size of DriverData

            //////////////////////////////////////////////////////////////////////////
            // Game State
            //////////////////////////////////////////////////////////////////////////

            public Int32 gamePaused;
            public Int32 gameInMenus;
            public Int32 gameInReplay;
            public Int32 gameUsingVr;

            public Int32 gameUnused1;

            //////////////////////////////////////////////////////////////////////////
            // High Detail
            //////////////////////////////////////////////////////////////////////////

            // High precision data for player's vehicle only
            public PlayerData player;

            //////////////////////////////////////////////////////////////////////////
            // Event And Session
            //////////////////////////////////////////////////////////////////////////

            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 64)]
            public byte[] trackName; // UTF-8
            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 64)]
            public byte[] layoutName; // UTF-8

            public Int32 trackId;
            public Int32 layoutId;

            // Layout length in meters
            public Single layoutLength;
            public SectorStarts<Single> sectorStartFactors;

            // Race session durations
            // Note: Index 0-2 = race 1-3
            // Note: Value -1 = N/A
            // Note: If both laps and minutes are more than 0, race session starts with minutes then adds laps
            public RaceDuration<Int32> raceSessionLaps;
            public RaceDuration<Int32> raceSessionMinutes;

            // The current race event index, for championships with multiple events
            // Note: 0-indexed, -1 = N/A
            public Int32 eventIndex;

            // Which session the player is in (practice, qualifying, race, etc.)
            // Note: See the R3E.Constant.Session enum
            public Int32 sessionType;

            // The current iteration of the current type of session (second qualifying session, etc.)
            // Note: 1 = first, 2 = second etc, -1 = N/A
            public Int32 sessionIteration;

            // If the session is time based, lap based or time based with an extra lap at the end
            public Int32 sessionLengthFormat;
 
            // Unit: Meter per second (m/s)
            public Single sessionPitSpeedLimit;

            // Which phase the current session is in (gridwalk, countdown, green flag, etc.)
            // Note: See the R3E.Constant.SessionPhase enum
            public Int32 sessionPhase;

            // Which phase start lights are in; -1 = unavailable, 0 = off, 1-5 = redlight on and counting down, 6 = greenlight on
            // Note: See the r3e_session_phase enum
            public Int32 startLights;

            // -1 = no data available
            //  0 = not active
            //  1 = active
            //  2 = 2x
            //  3 = 3x
            //  4 = 4x
            public Int32 tireWearActive;

            // -1 = no data
            //  0 = not active
            //  1 = active
            //  2 = 2x
            //  3 = 3x
            //  4 = 4x
            public Int32 fuelUseActive;

            // Total number of laps in the race, or -1 if player is not in race mode (practice, test mode, etc.)
            public Int32 numberOfLaps;

            // Amount of time and time remaining for the current session
            // Note: Only available in time-based sessions, -1.0 = N/A
            // Units: Seconds
            public Single sessionTimeDuration;
            public Single sessionTimeRemaining;

            // Server max incident points, -1 = N/A
            public Int32 maxIncidentPoints;

            // Reserved data
            public Single eventUnused2;

            //////////////////////////////////////////////////////////////////////////
            // Pit
            //////////////////////////////////////////////////////////////////////////

            // Current status of the pit stop
            // Note: See the R3E.Constant.PitWindow enum
            public Int32 pitWindowStatus;

            // The minute/lap from which you're obligated to pit (-1 = N/A)
            // Unit: Minutes in time-based sessions, otherwise lap
            public Int32 pitWindowStart;

            // The minute/lap into which you need to have pitted (-1 = N/A)
            // Unit: Minutes in time-based sessions, otherwise lap
            public Int32 pitWindowEnd;

            // If current vehicle is in pitline (-1 = N/A)
            public Int32 inPitlane;

            // What is currently selected in pit menu, and array of states (preset/buttons: -1 = not selectable, 1 = selectable) (actions: -1 = N/A, 0 = unmarked for fix, 1 = marked for fix)
            public Int32 pitMenuSelection;
            public PitMenuState pitMenuState;

            // Current vehicle pit state (-1 = N/A, 0 = None, 1 = Requested stop, 2 = Entered pitlane heading for pitspot, 3 = Stopped at pitspot, 4 = Exiting pitspot heading for pit exit)
            public Int32 pitState;

            // Current vehicle pitstop actions duration
            public Single pitTotalDuration;
            public Single pitElapsedTime;

            // Current vehicle pit action (-1 = N/A, 0 = None, 1 = Preparing, (combination of 2 = Penalty serve, 4 = Driver change, 8 = Refueling, 16 = Front tires, 32 = Rear tires, 64 = Body, 128 = Front wing, 256 = Rear wing, 512 = Suspension))
            public Int32 pitAction;

            // Number of pitstops the current vehicle has performed (-1 = N/A)
            public Int32 numPitstopsPerformed;

            public Single pitMinDurationTotal;
            public Single pitMinDurationLeft;

            //////////////////////////////////////////////////////////////////////////
            // Scoring & Timings
            //////////////////////////////////////////////////////////////////////////

            // The current state of each type of flag
            public Flags flags;

            // Current position (1 = first place)
            public Int32 position;
            // Based on performance index
            public Int32 positionClass;

            // Note: See the R3E.Constant.FinishStatus enum
            public Int32 finishStatus;

            // Total number of cut track warnings (-1 = N/A)
            public Int32 cutTrackWarnings;

            // The number of penalties the car currently has pending of each type (-1 = N/A)
            public CutTrackPenalties penalties;
            // Total number of penalties pending for the car
            // Note: See the 'penalties' field
            public Int32 numPenalties;

            // How many laps the player has completed. If this value is 6, the player is on his 7th lap. -1 = n/a
            public Int32 completedLaps;
            public Int32 currentLapValid;
            public Int32 trackSector;
            public Single lapDistance;
            // fraction of lap completed, 0.0-1.0, -1.0 = N/A
            public Single lapDistanceFraction;

            // The current best lap time for the leader of the session (-1.0 = N/A)
            public Single lapTimeBestLeader;
            // The current best lap time for the leader of the player's class in the current session (-1.0 = N/A)
            public Single lapTimeBestLeaderClass;
            // Sector times of fastest lap by anyone in session
            // Unit: Seconds (-1.0 = N/A)
            public Sectors<Single> sectorTimesSessionBestLap;
            // Unit: Seconds (-1.0 = none)
            public Single lapTimeBestSelf;
            public Sectors<Single> sectorTimesBestSelf;
            // Unit: Seconds (-1.0 = none)
            public Single lapTimePreviousSelf;
            public Sectors<Single> sectorTimesPreviousSelf;
            // Unit: Seconds (-1.0 = none)
            public Single lapTimeCurrentSelf;
            public Sectors<Single> sectorTimesCurrentSelf;
            // The time delta between the player's time and the leader of the current session (-1.0 = N/A)
            public Single lapTimeDeltaLeader;
            // The time delta between the player's time and the leader of the player's class in the current session (-1.0 = N/A)
            public Single lapTimeDeltaLeaderClass;
            // Time delta between the player and the car placed in front (-1.0 = N/A)
            // Units: Seconds
            public Single timeDeltaFront;
            // Time delta between the player and the car placed behind (-1.0 = N/A)
            // Units: Seconds
            public Single timeDeltaBehind;
            // Time delta between this car's current laptime and this car's best laptime
            // Unit: Seconds (-1000.0 = N/A)
            public Single timeDeltaBestSelf;
            // Best time for each individual sector no matter lap
            // Unit: Seconds (-1.0 = N/A)
            public Sectors<Single> bestIndividualSectorTimeSelf;
            public Sectors<Single> bestIndividualSectorTimeLeader;
            public Sectors<Single> bestIndividualSectorTimeLeaderClass;
            public Int32 incidentPoints;

            // -1 = N/A, 0 = this and next lap valid, 1 = this lap invalid, 2 = this and next lap invalid
            public Int32 lapValidState;

            // Reserved data
            public Single scoreUnused1;
            public Single scoreUnused2;

            //////////////////////////////////////////////////////////////////////////
            // Vehicle information
            //////////////////////////////////////////////////////////////////////////

            public DriverInfo vehicleInfo;
            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 64)]
            public byte[] playerName; // UTF-8

            //////////////////////////////////////////////////////////////////////////
            // Vehicle State
            //////////////////////////////////////////////////////////////////////////

            // Which controller is currently controlling the player's car (AI, player, remote, etc.)
            // Note: See the R3E.Constant.Control enum
            public Int32 controlType;

            // Unit: Meter per second (m/s)
            public Single carSpeed;

            // Unit: Radians per second (rad/s)
            public Single engineRps;
            public Single maxEngineRps;
            public Single upshiftRps;

            // -2 = N/A, -1 = reverse, 0 = neutral, 1 = first gear, ...
            public Int32 gear;
            // -1 = N/A
            public Int32 numGears;

            // Physical location of car's center of gravity in world space (X, Y, Z) (Y = up)
            public Vector3<Single> carCgLocation;
            // Pitch, yaw, roll
            // Unit: Radians (rad)
            public Orientation<Single> carOrientation;
            // Acceleration in three axes (X, Y, Z) of car body in local-space.
            // From car center, +X=left, +Y=up, +Z=back.
            // Unit: Meter per second squared (m/s^2)
            public Vector3<Single> localAcceleration;

            // Unit: Kilograms (kg)
            // Note: Car + penalty weight + fuel
            public Single totalMass;
            // Unit: Liters (l)
            // Note: Fuel per lap show estimation when not enough data, then max recorded fuel per lap
            // Note: Not valid for remote players
            public Single fuelLeft;
            public Single fuelCapacity;
            public Single fuelPerLap;
            // Unit: Celsius (C)
            // Note: Not valid for AI or remote players
            public Single engineWaterTemp;
            public Single engineOilTemp;
            // Unit: Kilopascals (KPa)
            // Note: Not valid for AI or remote players
            public Single fuelPressure;
            // Unit: Kilopascals (KPa)
            // Note: Not valid for AI or remote players
            public Single engineOilPressure;

            // Unit: (Bar)
            // Note: Not valid for AI or remote players (-1.0 = N/A)
            public Single turboPressure;

            // How pressed the throttle pedal is
            // Range: 0.0 - 1.0 (-1.0 = N/A)
            // Note: Not valid for AI or remote players
            public Single throttle;
            public Single throttleRaw;
            // How pressed the brake pedal is
            // Range: 0.0 - 1.0 (-1.0 = N/A)
            // Note: Not valid for AI or remote players
            public Single brake;
            public Single brakeRaw;
            // How pressed the clutch pedal is
            // Range: 0.0 - 1.0 (-1.0 = N/A)
            // Note: Not valid for AI or remote players
            public Single clutch;
            public Single clutchRaw;
            // How much the steering wheel is turned
            // Range: -1.0 - 1.0
            // Note: Not valid for AI or remote players
            public Single steerInputRaw;
            // How many degrees in steer lock (center to full lock)
            // Note: Not valid for AI or remote players
            public Int32 steerLockDegrees;
            // How many degrees in wheel range (degrees full left to rull right)
            // Note: Not valid for AI or remote players
            public Int32 steerWheelRangeDegrees;

            // Aid settings
            public AidSettings aidSettings;

            // DRS data
            public DRS drs;

            // Pit limiter (-1 = N/A, 0 = inactive, 1 = active)
            public Int32 pitLimiter;

            // Push to pass data
            public PushToPass pushToPass;

            // How much the vehicle's brakes are biased towards the back wheels (0.3 = 30%, etc.) (-1.0 = N/A)
            // Note: Not valid for AI or remote players
            public Single brakeBias;

            // DRS activations available in total (-1 = N/A or endless)
            public Int32 drsNumActivationsTotal;
            // PTP activations available in total (-1 = N/A, or there's no restriction per lap, or endless)
            public Int32 ptpNumActivationsTotal;

            // Battery state of charge
            // Range: 0.0 - 100.0 (-1.0 = N/A)
            public Single batterySoC;

            // Brake water tank (-1.0 = N/A)
            // Unit: Liters (l)
            public Single waterLeft;

            // Reserved data
            Orientation<Single> VehicleUnused1;

            //////////////////////////////////////////////////////////////////////////
            // Tires
            //////////////////////////////////////////////////////////////////////////

            // Which type of tires the player's car has (option, prime, etc.)
            // Note: See the R3E.Constant.TireType enum, deprecated - use the values further down instead
            public Int32 tireType;

            // Rotation speed
            // Uint: Radians per second
            public TireData<Single> tireRps;
            // Wheel speed
            // Uint: Meters per second
            public TireData<Single> tireSpeed;
            // Range: 0.0 - 1.0 (-1.0 = N/A)
            public TireData<Single> tireGrip;
            // Range: 0.0 - 1.0 (-1.0 = N/A)
            public TireData<Single> tireWear;
            // (-1 = N/A, 0 = false, 1 = true)
            public TireData<Int32> tireFlatspot;
            // Unit: Kilopascals (KPa) (-1.0 = N/A)
            // Note: Not valid for AI or remote players
            public TireData<Single> tirePressure;
            // Percentage of dirt on tire (-1.0 = N/A)
            // Range: 0.0 - 1.0
            public TireData<Single> tireDirt;

            // Current temperature of three points across the tread of the tire (-1.0 = N/A)
            // Optimum temperature
            // Cold temperature
            // Hot temperature
            // Unit: Celsius (C)
            // Note: Not valid for AI or remote players
            public TireData<TireTempInformation> tireTemp;

            // Which type of tires the car has (option, prime, etc.)
            // Note: See the R3E.Constant.TireType enum
            public Int32 tireTypeFront;
            public Int32 tireTypeRear;
            // Which subtype of tires the car has
            // Note: See the R3E.Constant.TireSubtype enum
			public Int32 tireSubtypeFront;
            public Int32 tireSubtypeRear;

            // Current brake temperature (-1.0 = N/A)
            // Optimum temperature
            // Cold temperature
            // Hot temperature
            // Unit: Celsius (C)
            // Note: Not valid for AI or remote players
            public TireData<BrakeTemp> brakeTemp;
            // Brake pressure (-1.0 = N/A)
            // Unit: Kilo Newtons (kN)
            // Note: Not valid for AI or remote players
            public TireData<Single> brakePressure;

            // Reserved data
            public Int32 tractionControlSetting;
            public Int32 engineMapSetting;
            public Int32 engineBrakeSetting;

            // -1.0 = N/A, 0.0 -> 100.0 percent
            public Single tractionControlPercent;

            // Which type of material under player car tires (tarmac, gravel, etc.)
            // Note: See the R3E.Constant.MtrlType enum
            public TireData<Int32> tireOnMtrl;

            // Tire load (N)
            // -1.0 = N/A
            public TireData<Single> tireLoad;

            //////////////////////////////////////////////////////////////////////////
            // Damage
            //////////////////////////////////////////////////////////////////////////

            // The current state of various parts of the car
            // Note: Not valid for AI or remote players
            public CarDamage carDamage;

            //////////////////////////////////////////////////////////////////////////
            // Driver Info
            //////////////////////////////////////////////////////////////////////////

            // Number of cars (including the player) in the race
            public Int32 numCars;

            // Contains name and basic vehicle info for all drivers in place order
            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 128)]
            public DriverData[] driverData;
        }
    }
}