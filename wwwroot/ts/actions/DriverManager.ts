import {ipcRenderer} from "electron";
import Action from "../Action.js";
import {IExtendedShared, valueIsValid} from "../consts.js";
import IShared, {ESession, IDriverData} from "../r3eTypes.js";
import {Driver, IExtendedDriverData, getUid} from "../utils.js";

export default class DriverManager extends Action {
    public drivers: {[uid: string]: Driver} = {};

    constructor() {
        super('DriverManager', 0, true);

        ipcRenderer.on('load-best-lap', (_e, data: any) => {
            data = JSON.parse(data);

            Driver.loadBestLap(data.bestLapTime, data.lapPoints, data.pointsPerMeter);
        });
    }

    public clearDriversTempData(data?: IShared): void {
        const cleared: Set<string> = new Set();
        for (const driver of data?.driverData ?? []) {
            const uid = getUid(driver.driverInfo);
            if (uid in this.drivers) {
                this.drivers[uid].clearTempData();
                cleared.add(uid);
            }
        }
        for (const uid of Object.keys(this.drivers)) {
            if (!cleared.has(uid))
                this.drivers[uid].clearTempData();
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
                shouldSaveBestLap = this.drivers[uid].endLap(data.lapTimePreviousSelf);
            else if (valueIsValid(prevSectors.sector3))
                shouldSaveBestLap = this.drivers[uid].endLap(prevSectors.sector3);
            else
                shouldSaveBestLap = this.drivers[uid].endLap(null);

            if (shouldSaveBestLap)
                this.drivers[uid].saveBestLap(data.layoutId, driver.driverInfo.classId, ipcRenderer);
        }
    }

    protected override onSessionChange(data: IShared, lastSession: ESession): void {
        this.clearDriversTempData(data);
    }

    execute(extendedData: IExtendedShared): void {
        const data = extendedData.rawData;

        if (data.gameInReplay)
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
                this.drivers[uid] = new Driver(uid, trackLength, driver.completedLaps);
            }

            if (driver.place == place) {
                const shouldLoad = this.drivers[uid].setAsMainDriver();
                
                if (shouldLoad) {
                    ipcRenderer.send('load-best-lap', [data.layoutId, driver.driverInfo.classId]);
                }
            }

            if (driver.inPitlane)
                this.drivers[uid].clearTempData();
            else if (!driver.currentLapValid)
                this.drivers[uid].setLapInvalid();

            this.drivers[uid].addDeltaPoint(driver.lapDistance, driver.completedLaps);
        }

        for (const uid in this.drivers) {
            if (!existingUids.has(uid)) {
                delete this.drivers[uid];
            }
        }
    }
}