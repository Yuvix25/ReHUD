import {ipcRenderer} from "electron";
import Action from "../Action.js";
import {IExtendedShared, sessionPhaseNotDriving, valueIsValidAssertUndefined} from "../consts.js";
import IShared, {ESession, IDriverData} from "../r3eTypes.js";
import {Driver, IExtendedDriverData, getUid} from "../utils.js";
import EventEmitter from '../EventEmitter.js';
import Hud from '../Hud.js';
import {SharedMemoryKey} from '../SharedMemoryConsumer.js';

export default class DriverManager extends Action {
    override sharedMemoryKeys: SharedMemoryKey[] = ['+lapId', 'driverData', 'lapTimePreviousSelf', 'completedLaps', 'sessionType', 'gameInMenus', 'gameInReplay', 'gamePaused', 'layoutId', 'sessionTimeRemaining', 'sessionPhase', 'position', 'layoutLength'];
    override isEnabled(): boolean {
        return true;
    }


    public drivers: {[uid: string]: Driver} = {};
    private removedDrivers: {[uid: string]: [Driver, number]} = {};
    private _leaderCrossedSFLineAt0: number = 0;

    public get leaderCrossedSFLineAt0(): number {
        return this._leaderCrossedSFLineAt0;
    }

    constructor() {
        super('DriverManager', 0, true);
    }

    public clearDriversTempData(data?: IShared): void {
        console.log('Clearing drivers temp data');
        const cleared: Set<string> = new Set();
        for (const driver of data?.driverData ?? []) {
            const uid = getUid(driver.driverInfo);
            if (uid in this.drivers) {
                this.drivers[uid].clearTempData();
                cleared.add(uid);
            }
        }
        for (const uid of Object.keys(this.drivers)) {
            if (!cleared.has(uid)) {
                this.drivers[uid].clearTempData();
            }
        }
    }

    protected override onPositionJump(_data: IExtendedShared, driver: IDriverData): void {
        const uid = getUid(driver?.driverInfo);
        if (uid in this.drivers) {
            this.drivers[uid].clearTempData();
        }
    }

    protected override onPitlaneEntrance(data: IExtendedShared, driver: IDriverData): void {
        this.onPositionJump(data, driver);
    }

    protected override onNewLap(extendedData: IExtendedShared, driver: IDriverData, isMainDriver: boolean): void {
        const data = extendedData.rawData;
        const uid = getUid(driver.driverInfo);
        if (uid in this.drivers) {
            const prevSectors = driver.sectorTimePreviousSelf;
            let shouldSaveBestLap = false;
            if (isMainDriver && valueIsValidAssertUndefined(data.lapTimePreviousSelf)) {
                shouldSaveBestLap = this.drivers[uid].endLap(data.lapTimePreviousSelf, data.completedLaps, data.sessionType);
            } else if (valueIsValidAssertUndefined(prevSectors.sector3)) {
                shouldSaveBestLap = this.drivers[uid].endLap(prevSectors.sector3, driver.completedLaps, data.sessionType);
            } else {
                shouldSaveBestLap = this.drivers[uid].endLap(null, driver.completedLaps, data.sessionType);
            }

            if (shouldSaveBestLap && !data.gameInMenus && !data.gameInReplay && !data.gamePaused) {
                this.drivers[uid].saveBestLap(extendedData.lapId);
            }
        }

        if (driver.place == 1 && (data.sessionTimeRemaining == 0 || this._leaderCrossedSFLineAt0 > 0)) {
            this._leaderCrossedSFLineAt0++;
        }
    }


    protected override onSessionChange(data: IExtendedShared, lastSession: ESession): void {
        if (data.rawData.sessionType === ESession.Unavailable) {
            this.drivers = {};
        }
        this._leaderCrossedSFLineAt0 = 0;
        this.clearDriversTempData(data.rawData);
        this.removedDrivers = {};
    }

    protected override onSessionPhaseChange(data: IExtendedShared, lastSessionPhase: number): void {
        if (sessionPhaseNotDriving(data.rawData.sessionPhase) || sessionPhaseNotDriving(lastSessionPhase)) {
            this.clearDriversTempData(data.rawData);
        }
    }

    execute(extendedData: IExtendedShared): void {
        const data = extendedData.rawData;

        if (data.gameInReplay && !data.gameInMenus)
            this.clearDriversTempData(data);

        if (data.gamePaused)
            return;

        const allDrivers: IExtendedDriverData[] = data.driverData;
        const place = data.position;
        const trackLength = data.layoutLength;
        const phase = data.sessionPhase;

        if (phase < 3) {
            this.drivers = {};
            return;
        }

        if (allDrivers == null || place == null || allDrivers.length === 0)
            return;

        const existingUids: Set<string> = new Set();
        const classes: number[] = [];

        for (const element of allDrivers) {
            const driver = element;

            const classIndex = driver.driverInfo.classPerformanceIndex;
            if (!classes.includes(classIndex))
                classes.push(classIndex);

            const uid = getUid(driver.driverInfo);
            driver.driverInfo.uid = uid;

            existingUids.add(uid);

            if (!(uid in this.drivers)) {
                if (uid in this.removedDrivers) {
                    
                    this.drivers[uid] = this.removedDrivers[uid][0];
                    const timeDiff = (Date.now() - this.removedDrivers[uid][1]) / 1000;
                    if (timeDiff > 3) { // 3 second temp data retention
                        console.log('Restoring driver (clearing temp data)', timeDiff.toFixed(2), uid);
                        this.drivers[uid].clearTempData();
                    } else {
                        console.log('Restoring driver (temp data intact)', timeDiff.toFixed(2), uid);
                    }
                    this.drivers[uid].setLapInvalid();
                    delete this.removedDrivers[uid];
                } else {
                    console.log('Adding driver', uid);
                    this.drivers[uid] = new Driver(uid, trackLength, driver.completedLaps);
                }
            }

            if (driver.place == place) {
                if (this.drivers[uid] != Driver.mainDriver) {
                    EventEmitter.emit(EventEmitter.MAIN_DRIVER_CHANGED_EVENT, true, extendedData, driver);
                }
                const shouldLoad = this.drivers[uid].setAsMainDriver();
                
                if (shouldLoad) {
                    Hud.hub.invoke('LoadBestLap', data.layoutId, driver.driverInfo.modelId, driver.driverInfo.classPerformanceIndex).then((data) => {
                        const dataObj = JSON.parse(data);
                        if (dataObj.lapTime != null) {
                            Driver.loadBestLap(dataObj.lapTime, dataObj.lapPoints, dataObj.pointsPerMeter);
                        }
                    });
                }
            }

            if (driver.inPitlane) {
                this.drivers[uid].clearTempData();
            } else if (!driver.currentLapValid) {
                this.drivers[uid].setLapInvalid();
            }

            this.drivers[uid].addDeltaPoint(driver.lapDistance, driver.completedLaps);
        }

        const toRemove = [];
        const now = Date.now();
        for (const uid in this.drivers) {
            if (!existingUids.has(uid)) {
                toRemove.push(uid);
                this.removedDrivers[uid] = [this.drivers[uid], now];
            }
        }

        if (toRemove.length > 0) console.log('Removing drivers', toRemove);
        toRemove.forEach((uid) => {
            delete this.drivers[uid];
        });
    }
}