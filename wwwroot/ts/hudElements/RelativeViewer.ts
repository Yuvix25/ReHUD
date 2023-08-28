import {ipcRenderer} from "electron";
import HudElement, {HUDElementOptions, Hide} from "../HudElement.js";
import IShared, {ESessionPhase, IDriverData, IDriverInfo} from "../r3eTypes.js";
import {Driver, IExtendedDriverData, getUid} from "../utils.js";
import {valueIsValid, RELATIVE_LENGTH, halfLengthTop, halfLengthBottom, insertCell, lerpRGBn, CLASS_COLORS, uint8ArrayToString, NA} from "../consts.js";
import DriverManager from "../actions/DriverManager.js";



export default class RelativeViewer extends HudElement {
    override inputKeys: string[] = ['driverData', 'position', 'layoutLength', 'sessionPhase', 'gameInReplay', 'layoutId'];

    private readonly driverManager: DriverManager;

    constructor(driverManager: DriverManager, options: HUDElementOptions) {
        super(options);

        this.driverManager = driverManager;
    }

    protected override render(allDrivers: IExtendedDriverData[], place: number, trackLength: number, phase: ESessionPhase, gameInReplay: number, layoutId: number): null | Hide {
        const relative = document.getElementById('relative-viewer');
        const relativeTable = relative.getElementsByTagName('tbody')[0];

        // 1 - garage, 2 - gridwalk, 3 - formation, 4 - countdown, 5 - green flag, 6 - checkered flag
        if (phase < 3) {
            relativeTable.innerHTML = '';
            return this.hide();
        }

        if (allDrivers == null || place == null || allDrivers.length <= 1)
            return this.hide();

        let driverCount = allDrivers.length;

        relative.style.display = 'block';

        const existingUids = new Set();
        const classes: number[] = [];

        let myUid: string = null;
        let mySharedMemory: IExtendedDriverData = null;
        let myDriver: Driver = null;
        for (let i = 0; i < allDrivers.length; i++) {
            const driver = allDrivers[i];

            const classIndex = driver.driverInfo.classPerformanceIndex;
            if (!classes.includes(classIndex))
                classes.push(classIndex);

            const uid = getUid(driver.driverInfo);
            driver.driverInfo.uid = uid;

            existingUids.add(uid);

            if (!(uid in this.driverManager.drivers)) {
                continue;
            }

            if (driver.place == place) {
                myUid = uid;
                mySharedMemory = driver;
                myDriver = this.driverManager.drivers[myUid];
            }
        }

        if (myUid == null || mySharedMemory == null || myDriver == null)
            return this.hide();

        if (driverCount <= RELATIVE_LENGTH / 2)
            relativeTable.parentElement.style.height = 'auto';
        else
            relativeTable.parentElement.style.height = 'var(--relative-view-height)';

        const deltasFront: Array<[IExtendedDriverData, number, Driver?]> = [];
        const deltasBehind: Array<[IExtendedDriverData, number, Driver]> = [];
        for (let i = 0; i < allDrivers.length; i++) {
            if (allDrivers[i] === mySharedMemory || allDrivers[i].inPitlane)
                continue;

            const uid = allDrivers[i].driverInfo.uid;

            const deltaAhead = myDriver.getDeltaToDriverAhead(this.driverManager.drivers[uid]);
            const deltaBehind = myDriver.getDeltaToDriverBehind(this.driverManager.drivers[uid]);
            if (deltaAhead == null && deltaBehind == null) {
                if (myDriver.getDistanceToDriverAhead(this.driverManager.drivers[uid]) < myDriver.getDistanceToDriverBehind(this.driverManager.drivers[uid]))
                    deltasFront.push([allDrivers[i], null, this.driverManager.drivers[uid]]);
                else
                    deltasBehind.push([allDrivers[i], null, this.driverManager.drivers[uid]]);
            } else if (deltaAhead == null)
                deltasBehind.push([allDrivers[i], deltaBehind, this.driverManager.drivers[uid]]);
            else if (deltaBehind == null)
                deltasFront.push([allDrivers[i], -deltaAhead, this.driverManager.drivers[uid]]);
            else if (deltaAhead < deltaBehind)
                deltasFront.push([allDrivers[i], -deltaAhead, this.driverManager.drivers[uid]]);
            else
                deltasBehind.push([allDrivers[i], deltaBehind, this.driverManager.drivers[uid]]);
        }

        deltasFront.sort((a, b) => {
            return myDriver.getDistanceToDriverAhead(b[2]) - myDriver.getDistanceToDriverAhead(a[2]);
        });
        deltasBehind.sort((a, b) => {
            return myDriver.getDistanceToDriverBehind(a[2]) - myDriver.getDistanceToDriverBehind(b[2]);
        });

        deltasFront.push([mySharedMemory, 0]);

        classes.sort((a, b) => a - b);
        const classMap: {[key: number]: number} = {};
        for (let i = 0; i < classes.length; i++) {
            classMap[classes[i]] = i;
        }

        driverCount = deltasFront.length + deltasBehind.length;

        let start = 0, end = RELATIVE_LENGTH;
        if (deltasFront.length - 1 >= halfLengthTop && deltasBehind.length >= halfLengthBottom) {
            start = deltasFront.length - halfLengthTop - 1; // -1 because we added the current driver
            end = deltasFront.length + halfLengthBottom;
        } else if (deltasFront.length - 1 < halfLengthTop) {
            start = 0;
            end = Math.min(driverCount, RELATIVE_LENGTH);
        } else if (deltasBehind.length < halfLengthBottom) {
            start = Math.max(0, driverCount - RELATIVE_LENGTH);
            end = driverCount;
        }

        const mergedDeltas = [...deltasFront, ...deltasBehind];
        for (let i = start; i < end; i++) {
            if (mergedDeltas[i] == undefined)
                break;
            const driver = mergedDeltas[i][0];
            if (driver.place == -1)
                break;

            const row = relativeTable.children.length > i - start ? relativeTable.children[i - start] : relativeTable.insertRow(i - start);
            if (!(row instanceof HTMLTableRowElement)) {
                console.error('something went wrong while creating the relative table, row is not an HTMLElement');
                return this.hide();
            }
            row.dataset.classIndex = driver.driverInfo.classPerformanceIndex.toString();

            if (driver === mySharedMemory) {
                row.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
            } else {
                row.style.backgroundColor = '';
            }

            const classId = driver.driverInfo.classId;
            const classImgCell = insertCell(row, undefined, 'class-img');
            let classImg = classImgCell.children?.[0]?.children?.[0];
            if (classImg == null) {
                classImg = document.createElement('div');
                classImgCell.appendChild(classImg);
                classImg = document.createElement('img');
                classImgCell.children[0].appendChild(classImg);
            }
            if (!(classImg instanceof HTMLImageElement)) {
                console.error('something went wrong while creating the relative table, classImg is not an HTMLElement');
                return this.hide();
            }

            classImg.src = `https://game.raceroom.com/store/image_redirect?id=${classId}&size=thumb`;

            const classColor = lerpRGBn(CLASS_COLORS, classMap[driver.driverInfo.classPerformanceIndex] / classes.length);
            const colorCell = insertCell(row, undefined, 'class-color');
            colorCell.style.backgroundColor = classColor;

            insertCell(row, driver.placeClass.toString(), 'place-class');

            const nameSplitted = uint8ArrayToString(driver.driverInfo.name).split(' ');
            let name = '';
            if (nameSplitted.length != 0) {
                for (let i = 0; i < nameSplitted.length - 1; i++) {
                    name += nameSplitted[i][0] + '. ';
                }
                name += nameSplitted[nameSplitted.length - 1];
            }
            insertCell(row, name, 'name');

            let carName = '';
            if (this.hud.r3eData != null) {
                const car = this.hud.r3eData.cars[driver.driverInfo.modelId];
                if (car != null) {
                    carName = car.Name;
                }
            }
            insertCell(row, carName, 'car-name');

            const deltaRaw = mergedDeltas[i][1];
            const delta = driver.place == place ? '' : (deltaRaw == null ? NA : deltaRaw.toFixed(1));
            insertCell(row, delta, 'time-delta');
        }

        while (relativeTable.children.length > end - start) {
            relativeTable.deleteRow(relativeTable.children.length - 1);
        }

        return null;
    }
}