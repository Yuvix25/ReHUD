// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

const {ipcRenderer} = require('electron');



class Value {
    // if valueName starts with '+', it will be taken from the extra data (and not from rawData)
    constructor(elementId, valuesNames, valueMap=null) {
        this.elementId = elementId;
        this.valueNames = typeof valuesNames === 'string' ? [valuesNames] : valuesNames;
        this.valueMap = valueMap ?? ((x) => x);
    }

    /**
     * If the return value is a string, it will be set as the innerHTML of the element.
     * If the return value is undefined, no change will be made.
     * If the return value is false, the element will be hidden.
     * @param {object} data - Shared memory data
     * @return {string|undefined|false}
     */
    getValueFromData(data) {
        const values = [];
        for (const valueName of this.valueNames) {
            if (valueName[0] === '+') {
                values.push(data[valueName.slice(1)]);
                continue;
            }
            values.push(data.rawData[valueName]);
        }
        return this.valueMap(...values, this.elementId);
    }
}


function lerpRGB(color1, color2, t) {
    t = Math.max(0, Math.min(t, 1));
    let color = [0, 0, 0];
    color[0] = color1[0] + ((color2[0] - color1[0]) * t);
    color[1] = color1[1] + ((color2[1] - color1[1]) * t);
    color[2] = color1[2] + ((color2[2] - color1[2]) * t);
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`
}

function lerpRGB3(color1, color2, color3, middle, t) {
    if (t < middle) {
        return lerpRGB(color1, color2, t / middle);
    }
    return lerpRGB(color2, color3, (t - middle) / (1 - middle));
}

function lerpRGBn(colors, t) {
    const middle = 1 / (colors.length - 1);
    const index = Math.floor(t / middle);
    return lerpRGB(colors[index], index < colors.length - 1 ? colors[index + 1] : [0, 0, 0], t % middle / middle);
}

/**
 * @param {Uint8Array} array
 * @return {string}
 */
function uint8ArrayToString(array) {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(Buffer.from(array));
}


function insertCell(row, value, className) {
    let cell;
    if (row.getElementsByClassName(className).length > 0) {
        cell = row.getElementsByClassName(className)[0];
    } else {
        cell = row.insertCell();
        if (value != null)
            cell.innerHTML = '<span></span>';
    }

    if (value != null)
        cell.firstChild.innerText = value;

    if (className != null)
        cell.className = className;
    return cell;
}



const RELATIVE_LENGTH = 8;
const halfLengthTop = Math.ceil((RELATIVE_LENGTH - 1) / 2);
const halfLengthBottom = Math.floor((RELATIVE_LENGTH - 1) / 2);
const deltaSortFunc = (a, b) => {
    const d1 = a[1];
    const d2 = b[1];
    if (d1 == null || d2 == null)
        return a[0].place - b[0].place;
    
    return d1 - d2;
}

const CLASS_COLORS = [
    [255, 51, 51],
    [255, 157, 51],
    [246, 255, 51],
    [140, 255, 51],
    [51, 255, 68],
    [51, 255, 174],
    [51, 230, 255],
    [51, 123, 255],
    [85, 51, 255],
];


let r3eData = null;
(async () => {
    r3eData = await (await fetch('https://raw.githubusercontent.com/sector3studios/r3e-spectator-overlay/master/r3e-data.json')).json();
})();

/**
 * @type {Object.<string, Driver>}
 */
let drivers = {};


const laptimeFormat = (time) => {
    if (!valueIsValid(time))
        return '-:--.---';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time - Math.floor(time)) * 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

const root = document.querySelector(':root');
const VALUES = [
    new Value('speed', 'carSpeed', (x) => typeof x !== 'number' ? 0 : Math.round(x * 3.6)),
    new Value('gear', 'gear', (x) => x == undefined || x == 0 ? 'N' : x == -1 ? 'R' : x),
    new Value('engine-map', 'engineMapSetting', (x) => `EM: ${x == -1 ? 5 : x}`),
    new Value('traction-control', ['tractionControlSetting', 'tractionControlPercent'], (x, y) =>
                `TC${x}` + (y == undefined ? `` : `: ${Math.round(y)}%`)),
    new Value('engine-brake', 'engineBrakeSetting', (x) => `EB: ${x}`),
    new Value('brake-bias', 'brakeBias', (x) => `BB: ${(100 - x * 100).toFixed(1)}%`),
    new Value('revs', ['engineRps', 'maxEngineRps', 'upshiftRps'], (current, max, upshift, id) => {
        if (current == undefined || max == undefined)
            return;
        if (upshift == undefined)
            upshift = max;

        document.getElementById(id).value = current;
        document.getElementById(id).max = max;

        if (current < upshift - (max - upshift) * 2.5) {
            root.style.setProperty('--revs-color', 'var(--revs-color-normal)');
        } else if (current < upshift) {
            root.style.setProperty('--revs-color', 'var(--revs-color-upshift)');
        } else {
            root.style.setProperty('--revs-color', 'var(--revs-color-redline)');
        }
    }),

    new Value('fuel-left', 'fuelLeft', (x) => x == undefined ? 'N/A' : `${x.toFixed(1)}`),
    new Value('fuel-per-lap', '+fuelPerLap', (x) => x == undefined ? 'N/A' : `${x.toFixed(2)}`),
    new Value('fuel-laps', ['fuelLeft', '+fuelPerLap'], (x, y) => {
        if (x == undefined || y == undefined) {
            root.style.setProperty('--fuel-left-color', 'rgb(0, 255, 0)')
            return 'N/A';
        }
        
        // 1 lap left - red, 5 laps left - green
        root.style.setProperty('--fuel-left-color', lerpRGB([255, 0, 0], [0, 255, 0], (x / y - 1) / 4));
        return `${(x / y).toFixed(1)}`;
    }),
    new Value('fuel-time', ['fuelLeft', '+fuelPerLap', '+averageLapTime'], (x, y, z) => {
        if (x == undefined || y == undefined || z == undefined)
            return 'N/A';
        const time = x / y * z;
        const hours = Math.floor(time / 3600);
        const minutes = (Math.floor(time / 60) % 60).toString().padStart(2, '0');
        const seconds = (Math.floor(time) % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }),
    new Value('fuel-last-lap', ['+fuelLastLap', '+fuelPerLap'], (x, y) => {
        if (x == undefined) {
            root.style.setProperty('--fuel-last-lap-color', 'var(--fuel-middle-color)');
            return 'N/A';
        }
        
        // lastlap consumed more than average - red, less - green, average - middle point
        root.style.setProperty('--fuel-last-lap-color', lerpRGB([255, 0, 0], [0, 255, 0], (y - x) * 2.5 + 0.5));
        return `${x.toFixed(2)}`;
    }),
    new Value('fuel-to-end', ['+lapsUntilFinish', '+fuelPerLap'], (x, y) => {
        if (x == undefined || y == undefined)
            return 'N/A';
        return `${(x * y).toFixed(1)}`;
    }),
    new Value('fuel-to-add', ['+lapsUntilFinish', '+fuelPerLap', 'fuelLeft'], (x, y, z) => {
        if (x == undefined || y == undefined || z == undefined) {
            root.style.setProperty('--fuel-to-add-color', 'var(--fuel-middle-color)');
            return 'N/A';
        }
        
        const fuelToAdd = x * y - z;
        root.style.setProperty('--fuel-to-add-color', lerpRGB([0, 255, 0], [255, 0, 0], (fuelToAdd + 0.7) * 1.43));
        return `${fuelToAdd.toFixed(1)}`;
    }),
    new Value('fuel-data', 'fuelUseActive', (x) => x ? undefined : false),

    new Value('tires', ['tireTemp', 'tireWear', 'brakeTemp', 'tireDirt'], (x, y, z, w) => {
        const nameMap = {
            'frontLeft': 'front-left',
            'frontRight': 'front-right',
            'rearLeft': 'rear-left',
            'rearRight': 'rear-right',
        }
        for (const tire in nameMap) {
            const name = nameMap[tire];

            const optimal = x?.[tire]?.optimalTemp;
            const cold = x?.[tire]?.coldTemp;
            const hot = x?.[tire]?.hotTemp;

            const optimalBrake = z?.[tire]?.optimalTemp;
            const coldBrake = z?.[tire]?.coldTemp;
            const hotBrake = z?.[tire]?.hotTemp;
            const currentBrake = z?.[tire]?.currentTemp;
            
            let wear = y?.[tire];
            wear = wear == undefined ? 0 : wear == -1 ? 1 : wear; // undefined == puncture

            let dirt = w?.[tire];
            dirt = dirt == undefined || dirt == -1 ? 0 : dirt;

            for (let i = 1; i <= 3; i++) {
                const side = ['left', 'center', 'right'][i - 1];
                const text = document.getElementById(`${name}-temp-${i}`);
                const progress = document.querySelector(`#${name}-${i} progress`);
                progress.value = wear;

                document.getElementById(`${name}-wear`).innerText = `${Math.round(wear * 100)}%`;

                const temp = x?.[tire]?.currentTemp?.[side];

                if (temp == undefined) {
                    text.innerText = 'N/A';
                    root.style.setProperty(`--${name}-${i}-color`, 'var(--temp-color-normal)');
                    continue;
                }
                
                text.innerText = `${Math.round(temp)}°`;
                
                if (!valueIsValid(optimal) || !valueIsValid(cold) || !valueIsValid(hot) || !valueIsValid(temp)) {
                    root.style.setProperty(`--${name}-${i}-color`, 'var(--temp-color-normal)');
                    continue;
                }
                root.style.setProperty(`--${name}-${i}-color`, lerpRGB3([0, 0, 200], [0, 200, 0], [200, 0, 0], (optimal - cold) / (hot - cold), (temp - cold) / (hot - cold)));

                if (!valueIsValid(optimalBrake) || !valueIsValid(coldBrake) || !valueIsValid(hotBrake) || !valueIsValid(currentBrake)) {
                    root.style.setProperty(`--${name}-brake-color`, 'var(--temp-color-normal)');
                    continue;
                }
                root.style.setProperty(`--${name}-brake-color`, lerpRGB3([0, 0, 200], [0, 200, 0], [200, 0, 0], (optimalBrake - coldBrake) / (hotBrake - coldBrake), (currentBrake - coldBrake) / (hotBrake - coldBrake)));
            
                
                const blackLevel = 0.05;
                // 3 to 5
                root.style.setProperty(`--dirty-${name}-size`, dirt < blackLevel ? '1px' : `${dirt * 2 + 3}px`);
                root.style.setProperty(`--dirty-${name}-color`, dirt < blackLevel ? `black` : lerpRGB3([0, 0, 0], [130, 50, 50], [255, 50, 50], 0.15, (dirt - blackLevel) / 0.9));
            }
        }
    }),
    new Value('inputs', ['throttleRaw', 'brakeRaw', 'clutchRaw', 'steerInputRaw', 'steerWheelRangeDegrees'], (tRaw, bRaw, cRaw, sRaw, sRange) => {
        const throttle = document.getElementById('throttle-input');
        const brake = document.getElementById('brake-input');
        const clutch = document.getElementById('clutch-input');
        const throttleProgress = document.getElementById('throttle-progress');
        const brakeProgress = document.getElementById('brake-progress');
        const clutchProgress = document.getElementById('clutch-progress');

        const steer = document.getElementById('steering-wheel');

        tRaw = valueIsValid(tRaw) ? tRaw : 0;
        bRaw = valueIsValid(bRaw) ? bRaw : 0;
        cRaw = valueIsValid(cRaw) ? cRaw : 0;
        sRaw = valueIsValid(sRaw) ? sRaw : 0;

        throttle.innerText = `${Math.round(tRaw * 100)}`;
        brake.innerText = `${Math.round(bRaw * 100)}`;
        clutch.innerText = `${Math.round(cRaw * 100)}`;

        throttleProgress.value = tRaw;
        brakeProgress.value = bRaw;
        clutchProgress.value = cRaw;

        const steerAngle = sRaw * sRange / 2;
        steer.style.transform = `rotate(${steerAngle}deg)`;
    }),

    new Value('damage', ['carDamage'], (x) => {
        for (const part of ['engine', 'transmission', 'suspension', 'aerodynamics']) {
            const element = document.querySelector(`#${part}-damage progress`);
            let value = x[part];
            if (value == null)
                value = 0;
            if (value == -1)
                return false;
                // value = 1;

            element.value = value === 0 ? 1 : value;
            root.style.setProperty(`--${part}-damage-color`, value == 0 ? 'var(--damage-color-full)' : value == 1 ? 'var(--damage-color-ok)' : 'var(--damage-color-partial)');
        }
    }),

    new Value('assist', ['aidSettings'], (x) => {
        let tc = x?.tc;
        let abs = x?.abs;

        tc = valueIsValid(tc) ? tc : 0;
        abs = valueIsValid(abs) ? abs : 0;

        root.style.setProperty('--tc-grayscale', tc == 5 ? 0 : 1);
        root.style.setProperty('--abs-grayscale', abs == 5 ? 0 : 1);
        root.style.setProperty('--tc-brightness', tc == 0 ? 1 : 10);
        root.style.setProperty('--abs-brightness', abs == 0 ? 1 : 10);
    }),

    new Value('relative-viewer', ['driverData', 'position', 'layoutLength', 'sessionPhase'], (all, place, trackLength, phase) => {
        const relative = document.getElementById('relative-viewer');
        if (all == null || place == null)
            return false;

        relative.style.display = 'block';
        const relativeTable = relative.getElementsByTagName('tbody')[0];

        place--;

        // 1 - garage, 2 - gridwalk, 3 - formation, 4 - countdown, 5 - green flag, 6 - checkered flag
        if (phase < 3) {
            relativeTable.innerHTML = '';
            drivers = {};
            return false;
        }

        let driverCount = 0;
        const classes = [];
        let myUid = null;
        for (let i = 0; i < all.length; i++) {
            const driver = all[i];
            if (driver.place == -1)
                break;

            driverCount++;
            const classIndex = driver.driverInfo.classPerformanceIndex;
            if (!classes.includes(classIndex))
                classes.push(classIndex);


            const uid = JSON.stringify(driver.driverInfo);
            driver.driverInfo.uid = uid;
            if (i == place)
                myUid = uid;
            
            if (!(uid in drivers)) {
                drivers[uid] = new Driver(uid, trackLength, driver.completedLaps);
            }

            if (drivers[uid].completedLaps != driver.completedLaps) {
                const prevSectors = driver.sectorTimePreviousSelf;
                drivers[uid].endLap(prevSectors.sector1 + prevSectors.sector2 + prevSectors.sector3);
            }
            drivers[uid].addDeltaPoint(driver.lapDistance, new Date().getTime() / 1000, driver.completedLaps);
        }

        if (driverCount == 0)
            return false;

        all = all.slice(0, driverCount);

        const deltasFront = [];
        const deltasBehind = [];
        for (let i = 0; i < all.length; i++) {
            if (all[i].place == place + 1)
                continue;
            const uid = all[i].driverInfo.uid;
            const deltaAhead = drivers[myUid].getDeltaToDriverAhead(drivers[uid]);
            const deltaBehind = drivers[myUid].getDeltaToDriverBehind(drivers[uid]);
            if (deltaAhead == null && deltaBehind == null) {
                if (all[i].place < place + 1)
                    deltasFront.push([all[i], null]);
                else
                    deltasBehind.push([all[i], null]);
            } else if (deltaAhead == null)
                deltasBehind.push([all[i], deltaBehind]);
            else if (deltaBehind == null)
                deltasFront.push([all[i], -deltaAhead]);
            else if (deltaAhead < deltaBehind)
                deltasFront.push([all[i], -deltaAhead]);
            else
                deltasBehind.push([all[i], deltaBehind]);
        }
        deltasFront.sort(deltaSortFunc);
        deltasBehind.sort(deltaSortFunc);

        deltasFront.push([all[place], 0]);

        classes.sort((a, b) => a - b);
        const classMap = {};
        for (let i = 0; i < classes.length; i++) {
            classMap[classes[i]] = i;
        }

        let start = 0, end = driverCount;
        if (deltasFront.length >= halfLengthTop && deltasBehind.length >= halfLengthBottom) {
            start = deltasFront.length - halfLengthTop;
            end = deltasFront.length + halfLengthBottom + 1;
        } else if (deltasFront.length < halfLengthTop) {
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
            row.dataset.classIndex = driver.driverInfo.classPerformanceIndex;

            if (driver.place == place + 1) {
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
            classImg.src = `https://game.raceroom.com/store/image_redirect?id=${classId}&size=thumb`;
            
            const classColor = lerpRGBn(CLASS_COLORS, classMap[driver.driverInfo.classPerformanceIndex] / classes.length);
            const colorCell = insertCell(row, undefined, 'class-color');
            colorCell.style.backgroundColor = classColor;

            insertCell(row, driver.placeClass, 'place-class');

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
            if (r3eData != null) {
                const car = r3eData.cars[driver.driverInfo.modelId];
                if (car != null) {
                    carName = car.Name;
                }
            }
            insertCell(row, carName, 'car-name');
    
            const deltaRaw = mergedDeltas[i][1];
            const delta = driver.place == place + 1 ? '' : (deltaRaw == null ? 'N/A' : deltaRaw.toFixed(1));
            insertCell(row, delta, 'time-delta');
        }

        while (relativeTable.children.length > end - start) {
            relativeTable.deleteRow(relativeTable.children.length - 1);
        }
    }),

    new Value('time-left', ['sessionTimeRemaining', 'numberOfLaps', 'sessionType', 'completedLaps', 'lapDistance', 'driverData'], (timeLeft, lapsLeft, sessionType, myLaps, myDistance, driverData) => {
        const timeLeftElement = document.getElementById('time-left');
        const lapsLeftElement = document.getElementById('laps-left');
        const sessionTypeElement = document.getElementById('session-type');

        if (!valueIsValid(myLaps))
            myLaps = 0;

        if (timeLeft == -1 && lapsLeft >= 0) {
            timeLeftElement.style.display = 'none';
            lapsLeftElement.style.display = 'block';

            sessionType = 4;

            const leaderDistance = driverData[0].lapDistance;
            let leaderLaps = driverData[0].completedLaps;
            if (!valueIsValid(leaderLaps))
                leaderLaps = 0;
            lapsLeft -= leaderLaps - myLaps;
            if (leaderDistance < myDistance && myLaps != leaderLaps) {
                lapsLeft++;
            }
            lapsLeftElement.innerText = `${myLaps+1}/${lapsLeft}`;
        } else if (timeLeft >= 0) {
            timeLeftElement.style.display = 'block';
            lapsLeftElement.style.display = 'none';
            timeLeftElement.children[0].innerText = Math.floor(timeLeft / 3600).toString(); // hours
            timeLeftElement.children[1].innerText = (Math.floor(timeLeft / 60) % 60).toString().padStart(2, '0'); // minutes
            timeLeftElement.children[2].innerText = (Math.floor(timeLeft) % 60).toString().padStart(2, '0'); // seconds
        }

        if (sessionType == -1) {
            sessionTypeElement.style.display = 'none';
        } else {
            sessionTypeElement.style.display = 'block';
        }
        switch (sessionType) {
            case 0:
                sessionTypeElement.innerText = 'Practice';
                break;
            case 1:
                sessionTypeElement.innerText = 'Qualifying';
                break;
            case 2:
                sessionTypeElement.innerText = 'Race';
                break;
            case 3:
                sessionTypeElement.innerText = 'Warmup';
                break;
            case 4:
                sessionTypeElement.innerText = 'Lap';
                break;
        }
    }),
    new Value('last-lap-session', 'lapTimePreviousSelf', laptimeFormat),
    new Value('best-lap-session', 'lapTimeBestSelf', laptimeFormat),
    new Value('position', ['position', 'positionClass', 'driverData'], (position, positionClass, drivers) => {
        if (!valueIsValid(position))
            return false;

        let myIndex = -1;
        for (let i = 0; i < drivers.length; i++) {
            if (drivers[i].place == position) {
                myIndex = i;
                break;
            }
        }
        
        let classCount = 0;
        for (const driver of drivers) {
            if (driver.place == -1)
                break;
            if (driver.classPerformanceIndex == drivers[myIndex].classPerformanceIndex)
                classCount++;
        }
        return `${position}/${classCount}`;
    }),

    new Value('leaderboard-challenge', 'sessionLengthFormat', (f) => {
        const elements = [
            document.getElementById('position-container'),
            document.getElementById('time-left-container'),
            document.getElementById('relative-viewer'),
        ]
        if (f === -1) { // only parameter I could find that is related to leaderboard challenge mode
            elements.forEach(e => e.style.display = 'none');
        } else {
            elements.forEach(e => e.style.display = null);
        }
    }),
];


function valueIsValid(val) {
    return val != undefined && val != -1;
}

let isShown = true;
ipcRenderer.on('data', (event, data) => {
    if (!isShown)
        return;
    data = data[0];
    for (const value of VALUES) {
        const element = document.getElementById(value.elementId);
        const newValue = value.getValueFromData(data);
        if (newValue === false)
            element.style.display = 'none';
        else if (newValue !== undefined && element != null)
            element.innerText = newValue;
    }
});

ipcRenderer.on('hide', () => {
    isShown = false;
    document.body.style.display = 'none';
});
ipcRenderer.on('show', () => {
    isShown = true;
    document.body.style.display = 'block';
});
