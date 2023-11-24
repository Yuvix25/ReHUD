import {ipcRenderer} from "electron";
import Action from "../Action.js";
import {IExtendedShared, sessionPhaseNotDriving, valueIsValid} from "../consts.js";
import IShared, {ESession, IDriverData} from "../r3eTypes.js";
import {Driver, IExtendedDriverData, getUid} from "../utils.js";

export default class DriverManager extends Action {
    public drivers: {[uid: string]: Driver} = {};
    private removedDrivers: {[uid: string]: [Driver, number]} = {};

    constructor() {
        super('DriverManager', 0, true);

        ipcRenderer.on('load-best-lap', (_e, data: any) => {
            data = JSON.parse(data);

            Driver.loadBestLap(data.bestLapTime, data.lapPoints, data.pointsPerMeter);
        });
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

    protected override onPositionJump(_data: IShared, driver: IDriverData): void {
        const uid = getUid(driver?.driverInfo);
        if (uid in this.drivers) {
            this.drivers[uid].clearTempData();
        }
    }

    protected override onPitlaneEntrance(data: IShared, driver: IDriverData): void {
        this.onPositionJump(data, driver);
    }

    protected override onNewLap(data: IShared, driver: IDriverData, isMainDriver: boolean): void {
        const uid = getUid(driver.driverInfo);
        if (uid in this.drivers) {
            const prevSectors = driver.sectorTimePreviousSelf;
            let shouldSaveBestLap = false;
            if (isMainDriver && valueIsValid(data.lapTimePreviousSelf))
                shouldSaveBestLap = this.drivers[uid].endLap(data.lapTimePreviousSelf, data.completedLaps, data.sessionType);
            else if (valueIsValid(prevSectors.sector3))
                shouldSaveBestLap = this.drivers[uid].endLap(prevSectors.sector3, driver.completedLaps, data.sessionType);
            else
                shouldSaveBestLap = this.drivers[uid].endLap(null, driver.completedLaps, data.sessionType);

            if (shouldSaveBestLap)
                this.drivers[uid].saveBestLap(data.layoutId, driver.driverInfo.classId, ipcRenderer);
        }
    }

    protected override onSessionChange(data: IShared, lastSession: ESession): void {
        this.clearDriversTempData(data);
        this.removedDrivers = {};
    }

    protected override onSessionPhaseChange(data: IShared, lastSessionPhase: number): void {
        if (sessionPhaseNotDriving(data.sessionPhase) || sessionPhaseNotDriving(lastSessionPhase)) {
            this.clearDriversTempData(data);
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
                        console.log('Restoring driver (clearing temp data):', timeDiff.toFixed(2), uid);
                        this.drivers[uid].clearTempData();
                    } else {
                        console.log('Restoring driver (temp data intact):', timeDiff.toFixed(2), uid);
                    }
                    this.drivers[uid].setLapInvalid();
                    delete this.removedDrivers[uid];
                } else {
                    console.log('Adding driver:', uid);
                    this.drivers[uid] = new Driver(uid, trackLength, driver.completedLaps);
                }
            }

            if (driver.place == place) {
                if (driver.driverInfo.name === data.playerName) {
                    const shouldLoad = this.drivers[uid].setAsMainDriver();
                    
                    if (shouldLoad) {
                        ipcRenderer.send('load-best-lap', [data.layoutId, driver.driverInfo.classId]);
                    }
                } else {
                    console.error('DriverManager: driver at position is NOT the main driver! (R3E API bug probably)', structuredClone(data));
                }
            }

            if (driver.inPitlane)
                this.drivers[uid].clearTempData();
            else if (!driver.currentLapValid)
                this.drivers[uid].setLapInvalid();

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

        if (toRemove.length > 0) console.log('Removing drivers:', toRemove);
        toRemove.forEach((uid) => {
            delete this.drivers[uid];
        });
    }
}