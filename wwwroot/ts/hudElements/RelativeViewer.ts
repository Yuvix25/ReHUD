import HudElement, {Hide} from "./HudElement.js";
import {ESessionPhase} from "../r3eTypes.js";
import {Driver, IExtendedDriverData, getUid} from "../utils.js";
import {RELATIVE_LENGTH, halfLengthTop, halfLengthBottom, insertCell, NA, nameFormat, getClassColors} from "../consts.js";
import DriverManager from "../actions/DriverManager.js";
import RankedData from "../actions/RankedData.js";


export default class RelativeViewer extends HudElement {
    override inputKeys: string[] = ['driverData', 'position', 'sessionPhase'];

    private driverManager: DriverManager = null;
    private rankedData: RankedData = null;

    protected override onHud(): void {
        this.driverManager = this.hud.driverManagerService;
        this.rankedData = this.hud.rankedDataService;
    }

    protected override render(allDrivers: IExtendedDriverData[], place: number, phase: ESessionPhase): null | Hide {
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

        const classColors = getClassColors(allDrivers);

        let myUid: string = null;
        let mySharedMemory: IExtendedDriverData = null;
        let myDriver: Driver = null;
        for (const driver of allDrivers) {
            const uid = getUid(driver.driverInfo);
            driver.driverInfo.uid = uid;

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

        const deltasFront: Array<[IExtendedDriverData, number, Driver?]> = [];
        const deltasBehind: Array<[IExtendedDriverData, number, Driver]> = [];
        for (const driver of allDrivers) {
            if (driver === mySharedMemory)
                continue;

            const uid = driver.driverInfo.uid;

            const deltaAhead = myDriver.getDeltaToDriverAhead(this.driverManager.drivers[uid]);
            const deltaBehind = myDriver.getDeltaToDriverBehind(this.driverManager.drivers[uid]);
            if (deltaAhead == null && deltaBehind == null) {
                if (myDriver.getDistanceToDriverAhead(this.driverManager.drivers[uid]) < myDriver.getDistanceToDriverBehind(this.driverManager.drivers[uid]))
                    deltasFront.push([driver, null, this.driverManager.drivers[uid]]);
                else
                    deltasBehind.push([driver, null, this.driverManager.drivers[uid]]);
            } else if (deltaAhead == null)
                deltasBehind.push([driver, deltaBehind, this.driverManager.drivers[uid]]);
            else if (deltaBehind == null)
                deltasFront.push([driver, -deltaAhead, this.driverManager.drivers[uid]]);
            else if (deltaAhead < deltaBehind)
                deltasFront.push([driver, -deltaAhead, this.driverManager.drivers[uid]]);
            else
                deltasBehind.push([driver, deltaBehind, this.driverManager.drivers[uid]]);
        }

        deltasFront.sort((a, b) => {
            return myDriver.getDistanceToDriverAhead(b[2]) - myDriver.getDistanceToDriverAhead(a[2]);
        });
        deltasBehind.sort((a, b) => {
            return myDriver.getDistanceToDriverBehind(a[2]) - myDriver.getDistanceToDriverBehind(b[2]);
        });

        deltasFront.push([mySharedMemory, 0]);

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

        if (mergedDeltas.length <= 5)
            this.root.style.setProperty('--relative-view-row-height', '40px');
        else
            this.root.style.setProperty('--relative-view-row-height', 'auto');

        let zeroDeltaCount = 0;
        for (let i = start; i < end; i++) {
            if (mergedDeltas[i] == undefined)
                break;
            const driver = mergedDeltas[i][0];
            if (driver.place == -1)
                break;

            const row = relativeTable.children.length > i - start ? relativeTable.children[i - start] : relativeTable.insertRow(i - start);
            row.classList.remove('last-row')
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

            const classColor = classColors.get(driver.driverInfo.classPerformanceIndex);
            const colorCell = insertCell(row, undefined, 'class-color');
            colorCell.style.backgroundColor = classColor;

            insertCell(row, driver.placeClass.toString(), 'place-class');

            const name = nameFormat(driver.driverInfo.name)
            insertCell(row, name, 'name');

            let carName = '';
            if (this.hud.r3eData != null) {
                const car = this.hud.r3eData.cars[driver.driverInfo.modelId];
                if (car != null) {
                    carName = car.Name;
                }
            }
            insertCell(row, carName, 'car-name');

            const rankedData = this.rankedData.getRankedData(driver.driverInfo.userId);
            const rating = rankedData?.Rating.toFixed(0) ?? '1500';
            const reputation = rankedData?.Reputation.toFixed(0) ?? '70';
            insertCell(row, rating + '/' + reputation, 'ranked');

            const deltaRaw = mergedDeltas[i][1];
            if (typeof deltaRaw === 'number' && deltaRaw.toFixed(1) === '0.0')
                zeroDeltaCount++;
            const delta = driver.place == place ? '' : (deltaRaw == null ? NA : deltaRaw.toFixed(1));
            insertCell(row, delta, 'time-delta');
        }
        if (zeroDeltaCount >= 3) {
            console.warn('relative 0.0 bug detected');
        }

        while (relativeTable.children.length > end - start) {
            relativeTable.deleteRow(relativeTable.children.length - 1);
        }

        const lastRow = relativeTable.insertRow(relativeTable.children.length);
        lastRow.classList.add('last-row');

        return null;
    }
}