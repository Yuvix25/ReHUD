// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

const {ipcRenderer} = require('electron');

document.addEventListener('DOMContentLoaded', () => enableLogging(ipcRenderer, 'index.js'));


const DEFAULT_RENDER_CYCLE = 30;

class Value {
    // if valueName starts with '+', it will be taken from the extra data (and not from rawData)
    constructor({containerId = null, elementId, inputValues, renderEvery = DEFAULT_RENDER_CYCLE, valueMap = null}) {
        this.containerId = containerId;
        this.elementId = elementId;
        this.inputValues = typeof inputValues === 'string' ? [inputValues] : inputValues;
        this.valueMap = typeof renderEvery === 'function' ? renderEvery : valueMap ?? ((x) => x);
        this.refreshRate = typeof renderEvery === 'number' ? renderEvery : DEFAULT_RENDER_CYCLE;
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
        for (const valueName of this.inputValues) {
            if (valueName[0] === '+') {
                values.push(data[valueName.slice(1)]);
                continue;
            }
            values.push(data.rawData[valueName]);
        }
        return this.valueMap(...values, this.elementId);
    }
}

class _Hide {
    constructor(elementId=null) {
        this.elementId = elementId;
    }
}

const Hide = (elementId=null) => new _Hide(elementId);


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


const RADAR_RADIUS = 12; // meters
const RADAR_BEEP_MIN_SPEED = 15; // km/h
let RADAR_AUDIO_CONTROLLER = null;

document.addEventListener('DOMContentLoaded', () => {
    RADAR_AUDIO_CONTROLLER = new AudioController({volumeMultiplier: 1});
});

const RELATIVE_LENGTH = 8;
const halfLengthTop = Math.ceil((RELATIVE_LENGTH - 1) / 2);
const halfLengthBottom = Math.floor((RELATIVE_LENGTH - 1) / 2);


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

/**
 * @type {'kmh'|'mph'}
 */
let SPEED_UNITS = 'kmh';


const NA = 'N/A';

const root = document.querySelector(':root');
const VALUES = [
    new Value({elementId: 'speed', inputValues: 'carSpeed', renderEvery: 5, valueMap: (x) => Math.round((typeof x !== 'number' ? 0 : x * 3.6) * (SPEED_UNITS === 'mph' ? 0.621371 : 1))}),
    new Value({elementId: 'gear', inputValues: 'gear', renderEvery: 3, valueMap: (x, gearId) => {
        const gearElement = document.getElementById(gearId);
        const res = (x == undefined || x == 0) ? 'N' : x == -1 ? 'R' : x.toString();
        if (res.length == 1)
            gearElement.width = '69px';
        else
            gearElement.width = '117px';
        
        return res;
    }}),
    new Value({elementId: 'engine-map', inputValues: 'engineMapSetting', valueMap: (x) => `EM: ${valueIsValid(x) ? 5 : x}`}),
    new Value({elementId: 'traction-control', inputValues: ['tractionControlSetting', 'tractionControlPercent'], valueMap: (x, y) =>
                `TC${(valueIsValid(x) ? x : ': ' + NA)}` + (valueIsValid(y) ? `: ${Math.round(y)}%` : '')}),
    new Value({elementId: 'engine-brake', inputValues: 'engineBrakeSetting', valueMap: (x) => `EB: ${valueIsValid(x) ? x : NA}`}),
    new Value({elementId: 'brake-bias', inputValues: 'brakeBias', valueMap: (x) => `BB: ${(100 - x * 100).toFixed(1)}%`}),
    new Value({elementId: 'revs', inputValues: ['engineRps', 'maxEngineRps', 'upshiftRps', 'pitLimiter'], renderEvery: 1, valueMap: (current, max, upshift, pitLimiter, id) => {
        if (!valueIsValid(current) || !valueIsValid(max))
            return;
        if (upshift == undefined)
            upshift = max;

        try {
            document.getElementById(id).value = current;
        } catch (e) {
            console.error(e);
            console.error(`error setting value of '${id}' to ${current} (revs)`);
            return;
        }
        document.getElementById(id).max = max;

        if (pitLimiter === 1) {
            const time = new Date().getTime();
            current = time % 250 < 125 ? upshift - 0.001 : max;
        }

        if (current < upshift - (max - upshift) * 2.5) {
            root.style.setProperty('--revs-color', 'var(--revs-color-normal)');
        } else if (current < upshift) {
            root.style.setProperty('--revs-color', 'var(--revs-color-upshift)');
        } else {
            root.style.setProperty('--revs-color', 'var(--revs-color-redline)');
        }
    }}),

    new Value({elementId: 'fuel-left', inputValues: 'fuelLeft', valueMap: (x) => x == undefined ? NA : `${x.toFixed(1)}`}),
    new Value({elementId: 'fuel-per-lap', inputValues: '+fuelPerLap', valueMap: (x) => x == undefined ? NA : `${x.toFixed(2)}`}),
    new Value({elementId: 'fuel-laps', inputValues: ['fuelLeft', '+fuelPerLap'], valueMap: (x, y) => {
        if (x == undefined || y == undefined) {
            root.style.setProperty('--fuel-left-color', 'rgb(0, 255, 0)')
            return NA;
        }
        
        // 1 lap left - red, 5 laps left - green
        root.style.setProperty('--fuel-left-color', lerpRGB([255, 0, 0], [0, 255, 0], (x / y - 1) / 4));
        return `${(x / y).toFixed(1)}`;
    }}),
    new Value({elementId: 'fuel-time', inputValues: ['fuelLeft', '+fuelPerLap', '+averageLapTime'], valueMap: (x, y, z) => {
        if (x == undefined || y == undefined || z == undefined)
            return NA;
        const time = x / y * z;
        const hours = Math.floor(time / 3600);
        const minutes = (Math.floor(time / 60) % 60).toString().padStart(2, '0');
        const seconds = (Math.floor(time) % 60).toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }}),
    new Value({elementId: 'fuel-last-lap', inputValues: ['+fuelLastLap', '+fuelPerLap'], valueMap: (x, y) => {
        if (x == undefined) {
            root.style.setProperty('--fuel-last-lap-color', 'var(--fuel-middle-color)');
            return NA;
        }
        
        // last lap consumed more than average - red, less - green, average - middle point
        root.style.setProperty('--fuel-last-lap-color', lerpRGB([255, 0, 0], [0, 255, 0], (y - x) * 2.5 + 0.5));
        return `${x.toFixed(2)}`;
    }}),
    new Value({elementId: 'fuel-to-end', inputValues: ['+lapsUntilFinish', '+fuelPerLap'], valueMap: (x, y) => {
        if (x == undefined || y == undefined)
            return NA;
        return `${(x * y).toFixed(1)}`;
    }}),
    new Value({elementId: 'fuel-to-add', inputValues: ['+lapsUntilFinish', '+fuelPerLap', 'fuelLeft'], valueMap: (x, y, z) => {
        if (x == undefined || y == undefined || z == undefined) {
            root.style.setProperty('--fuel-to-add-color', 'var(--fuel-middle-color)');
            return NA;
        }
        
        const fuelToAdd = x * y - z;
        root.style.setProperty('--fuel-to-add-color', lerpRGB([0, 255, 0], [255, 0, 0], (fuelToAdd + 0.7) * 1.43));
        return `${fuelToAdd.toFixed(1)}`;
    }}),
    new Value({elementId: 'fuel-data', inputValues: 'fuelUseActive', valueMap: (x) => x ? undefined : Hide()}),

    new Value({renderEvery: 15, elementId: 'tires', inputValues: ['tireTemp', 'tireWear', 'brakeTemp', 'tireDirt'], valueMap: (x, y, z, w) => {
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
                    text.innerText = NA;
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
    }}),

    new Value({renderEvery: 1, elementId: 'inputs', inputValues: ['throttleRaw', 'brakeRaw', 'clutchRaw', 'steerInputRaw', 'steerWheelRangeDegrees'], valueMap: (tRaw, bRaw, cRaw, sRaw, sRange) => {
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
    }}),

    new Value({elementId: 'damage', inputValues: ['carDamage'], valueMap: (x) => {
        for (const part of ['engine', 'transmission', 'suspension', 'aerodynamics']) {
            const element = document.querySelector(`#${part}-damage progress`);
            let value = x[part];
            if (value == null)
                value = 0;
            if (value == -1)
                return Hide();

            element.value = value === 0 ? 1 : value;
            root.style.setProperty(`--${part}-damage-color`, value == 0 ? 'var(--damage-color-full)' : value == 1 ? 'var(--damage-color-ok)' : 'var(--damage-color-partial)');
        }
    }}),

    new Value({renderEvery: 1, elementId: 'assist', inputValues: ['aidSettings'], valueMap: (x) => {
        let tc = x?.tc;
        let abs = x?.abs;

        tc = valueIsValid(tc) ? tc : 0;
        abs = valueIsValid(abs) ? abs : 0;

        if (tc == 0)
            document.getElementById('tc-icon').style.display = 'none';
        else
            document.getElementById('tc-icon').style.display = 'block';
        
        if (abs == 0)
            document.getElementById('abs-icon').style.display = 'none';
        else
            document.getElementById('abs-icon').style.display = 'block';

        root.style.setProperty('--tc-grayscale', tc == 5 ? 0 : 1);
        root.style.setProperty('--abs-grayscale', abs == 5 ? 0 : 1);
        root.style.setProperty('--tc-brightness', tc == 0 ? 1 : 10);
        root.style.setProperty('--abs-brightness', abs == 0 ? 1 : 10);
    }}),

    new Value({renderEvery: 5, elementId: 'relative-viewer', inputValues: ['driverData', 'position', 'layoutLength', 'sessionPhase'], valueMap: (all, place, trackLength, phase) => {
        const relative = document.getElementById('relative-viewer');
        const relativeTable = relative.getElementsByTagName('tbody')[0];

        // 1 - garage, 2 - gridwalk, 3 - formation, 4 - countdown, 5 - green flag, 6 - checkered flag
        if (phase < 3) {
            relativeTable.innerHTML = '';
            drivers = {};
            return Hide();
        }

        if (all == null || place == null)
            return Hide();
        
        const driverCount = all.length;
        if (driverCount <= 1)
            return Hide();

        

        place--;

        relative.style.display = 'block';
        
        const classes = [];
        /**
         * @type {string}
         */
        let myUid = null;
        for (let i = 0; i < all.length; i++) {
            const driver = all[i];

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

        all = all.slice(0, driverCount);


        if (driverCount <= RELATIVE_LENGTH / 2)
            relativeTable.parentElement.style.height = 'auto';
        else
            relativeTable.parentElement.style.height = 'var(--relative-view-height)';

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
                    deltasFront.push([all[i], null, drivers[uid]]);
                else
                    deltasBehind.push([all[i], null, drivers[uid]]);
            } else if (deltaAhead == null)
                deltasBehind.push([all[i], deltaBehind, drivers[uid]]);
            else if (deltaBehind == null)
                deltasFront.push([all[i], -deltaAhead, drivers[uid]]);
            else if (deltaAhead < deltaBehind)
                deltasFront.push([all[i], -deltaAhead, drivers[uid]]);
            else
                deltasBehind.push([all[i], deltaBehind, drivers[uid]]);
        }

        deltasFront.sort((a, b) => {
            return drivers[myUid].getDistanceToDriverAhead(b[2]) - drivers[myUid].getDistanceToDriverAhead(a[2]);
        });
        deltasBehind.sort((a, b) => {
            return drivers[myUid].getDistanceToDriverBehind(a[2]) - drivers[myUid].getDistanceToDriverBehind(b[2]);
        });

        deltasFront.push([all[place], 0]);

        classes.sort((a, b) => a - b);
        const classMap = {};
        for (let i = 0; i < classes.length; i++) {
            classMap[classes[i]] = i;
        }

        let start = 0, end = RELATIVE_LENGTH;
        if (deltasFront.length-1 >= halfLengthTop && deltasBehind.length >= halfLengthBottom) {
            start = deltasFront.length - halfLengthTop - 1; // -1 because we added the current driver
            end = deltasFront.length + halfLengthBottom;
        } else if (deltasFront.length-1 < halfLengthTop) {
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
            const delta = driver.place == place + 1 ? '' : (deltaRaw == null ? NA : deltaRaw.toFixed(1));
            insertCell(row, delta, 'time-delta');
        }

        while (relativeTable.children.length > end - start) {
            relativeTable.deleteRow(relativeTable.children.length - 1);
        }
    }}),

    new Value({renderEvery: 5, elementId: 'time-laps-left', inputValues: ['sessionTimeRemaining', 'numberOfLaps', 'sessionType', 'completedLaps'], valueMap: (timeLeft, lapsLeft, sessionType, myLaps) => {
        const timeLeftElement = document.getElementById('time-left');
        const lapsLeftElement = document.getElementById('laps-left');
        const sessionTypeElement = document.getElementById('session-type');

        if (!valueIsValid(myLaps))
            myLaps = 0;

        if (timeLeft == -1 && lapsLeft >= 0) {
            timeLeftElement.style.display = 'none';
            lapsLeftElement.style.display = 'block';

            sessionType = 4;

            lapsLeftElement.innerText = `${myLaps+1}/${lapsLeft}`;
        } else if (timeLeft >= 0) {
            timeLeftElement.style.display = 'block';
            lapsLeftElement.style.display = 'none';
            timeLeftElement.children[0].innerText = Math.floor(timeLeft / 3600).toString(); // hours
            timeLeftElement.children[1].innerText = (Math.floor(timeLeft / 60) % 60).toString().padStart(2, '0'); // minutes
            timeLeftElement.children[2].innerText = (Math.floor(timeLeft) % 60).toString().padStart(2, '0'); // seconds
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
                sessionTypeElement.innerText = 'Laps';
                break;
            default:
                sessionTypeElement.innerText = 'Time Left';
                break;
        }
    }}),
    new Value({'containerId': 'estimated-laps-left-container', elementId: 'estimated-laps-left', inputValues: ['sessionType', 'completedLaps', 'lapDistanceFraction', '+estimatedRaceLapCount'], valueMap: (sessionType, completedLaps, fraction, totalLaps) => {
        if (sessionType != 2 || !valueIsValid(totalLaps))
            return Hide();
        
        if (!valueIsValid(completedLaps)) {
            completedLaps = -1;
            totalLaps--; // in the backend, completedLaps is 0 before the start, so you get an extra lap calculated (the one you'll complete when crossing the start line)
        }
        if (!valueIsValid(fraction))
            fraction = 0;
        
        completedLaps += fraction;

        return `${Math.max(completedLaps, 0).toFixed(1)}/${totalLaps}`;
    }}),
    new Value({elementId: 'last-lap-session', inputValues: 'lapTimePreviousSelf', valueMap: laptimeFormat}),
    new Value({elementId: 'best-lap-session', inputValues: 'lapTimeBestSelf', valueMap: laptimeFormat}),
    new Value({containerId: 'position-container', elementId: 'position', inputValues: ['position', 'positionClass', 'driverData'], valueMap: (position, positionClass, drivers) => {
        if (!valueIsValid(position))
            return Hide();

        let myIndex = -1;
        for (let i = 0; i < drivers.length; i++) {
            if (drivers[i].place == position) {
                myIndex = i;
                break;
            }
        }
        
        let classCount = 0;
        for (const driver of drivers)
            if (driver.classPerformanceIndex == drivers[myIndex].classPerformanceIndex)
                classCount++;

        return `${position}/${classCount}`;
    }}),

    new Value({renderEvery: 120, elementId: 'leaderboard-challenge', inputValues: 'sessionLengthFormat', valueMap: (f) => {
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
    }}),


    new Value({renderEvery: 1, elementId: 'radar', inputValues: ['driverData', 'player', 'position','carSpeed'], valueMap:
        /**
         * @param {Array} drivers
         * @param {Object} driver
         */
        (drivers, driver, myPlace, speed, radar) => {
            if (driver == undefined)
                return Hide();

            radar = document.getElementById(radar);

            speed = mpsToKph(speed);

            const radar_size = radar.offsetWidth;

            const rotationMatrix = rotationMatrixFromEular(driver.orientation);

            drivers.forEach(d => {
                if (myPlace != d.place) {
                    d.relativePosition = rotateVector(rotationMatrix, vectorSubtract(driver.position, d.position)); // x - left/right, z - front/back
                    d.relativeOrientation = vectorSubtract(d.orientation, driver.orientation);
                } else {
                    d.relativePosition = { x: 0, y: 0, z: 0 };
                    d.relativeOrientation = { x: 0, y: 0, z: 0 };
                }
            });
            const close = drivers.filter(d => distanceFromZero(d.relativePosition) < RADAR_RADIUS);

            let closeLeft = 0;
            let closeRight = 0;
            let closest = null;
            for (let i = 0; i < radar.children.length + close.length; i++) {
                if (i >= close.length) {
                    if (i < radar.children.length)
                        radar.children[i].style.display = 'none';
                    continue;
                } else if (i >= radar.children.length) {
                    const newElement = document.createElement('div');
                    newElement.className = 'radar-car';
                    radar.appendChild(newElement);
                }
                radar.children[i].style.display = null;
                const driver = close[i];

                const rotation = driver.relativeOrientation.y;
                const leftRight = driver.relativePosition.x;
                let frontBack = driver.relativePosition.z;

                const car_width = driver.driverInfo.carWidth;
                const car_length = driver.driverInfo.carLength;

                if (leftRight < 0 && (Math.abs(frontBack) < Math.abs(leftRight) || Math.abs(frontBack) <= car_length))
                    closeLeft = 1;
                else if (leftRight > 0 && (Math.abs(frontBack) < Math.abs(leftRight) || Math.abs(frontBack) <= car_length))
                    closeRight = 1;

                frontBack = -frontBack;
                
                const distance = distanceFromZero(driver.relativePosition);

                const width = car_width / RADAR_RADIUS * radar_size / 2;
                const height = car_length / RADAR_RADIUS * radar_size / 2;
                
                radar.children[i].style.left = `${(leftRight / RADAR_RADIUS) * radar_size / 2 + radar_size / 2 - width / 2}px`;
                radar.children[i].style.top = `${(frontBack / RADAR_RADIUS) * radar_size / 2 + radar_size / 2 - height / 2}px`;
                radar.children[i].style.width = `${width}px`;
                radar.children[i].style.height = `${height}px`;
                radar.children[i].style.transform = `rotate(${rotation}rad)`;

                if (myPlace == driver.place) {
                    radar.children[i].classList.add('radar-car-self');
                } else {
                    if (closest == null || distance < closest)
                        closest = distance;
                    radar.children[i].classList.remove('radar-car-self');
                }
            }

            let backgroundImage = 'radial-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4) ),url("/icons/radar-grid.png")';
            if (closeLeft === 1)
                backgroundImage += ',url("/icons/radar-grid-warning-left.png")';
            if (closeRight === 1)
                backgroundImage += ',url("/icons/radar-grid-warning-right.png")';

            radar.style.backgroundImage = backgroundImage;

            if ((closeLeft === 1 || closeRight === 1) && speed >= RADAR_BEEP_MIN_SPEED && RADAR_AUDIO_CONTROLLER != null)
                RADAR_AUDIO_CONTROLLER.play(1 - closest / RADAR_RADIUS, closeLeft * -1 + closeRight * 1);
            
            if (closest === null)
                return Hide();
    }}),
];


function valueIsValid(val) {
    return val != undefined && val != -1;
}


const iterationCycle = 100;

let isShown = true;
let iteration = 0;
let lastData = null;
ipcRenderer.on('data', (event, data) => {
    if (!isShown)
        return;
    data = data[0];
    lastData = data;
    for (const value of VALUES) {
        if (iteration % value.refreshRate != 0)
            continue;

        const element = document.getElementById(value.elementId);
        const container = value.containerId == null ? null : document.getElementById(value.containerId);
        const newValue = value.getValueFromData(data);

        const hide = newValue instanceof _Hide;

        if (hide) {
            if (container != null)
                container.style.display = 'none';
            else if (element != null)
                element.style.display = 'none';
        } else {
            if (container != null)
                container.style.display = null;
            else if (element != null)
                element.style.display = null;
        }

        if (!hide && newValue !== undefined && element != null)
            element.innerText = newValue;
    }
    iteration++;
    if (iteration >= iterationCycle) {
        iteration = 0;
    }
});


function show() {
    isShown = true;
    document.body.style.display = 'block';
}

function hide() {
    isShown = false;
    document.body.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', hide);
ipcRenderer.on('hide', hide);
ipcRenderer.on('show', show);

ipcRenderer.on('settings', (e, arg) => {
    const dataBase64 = Buffer.from(arg[0]).toString('base64');
    location.href = '/Settings#' + dataBase64;
})



ipcRenderer.on('set-setting', (e, arg) => {
    const [key, value] = JSON.parse(arg);

    switch (key) {
        case 'speedUnits':
            SPEED_UNITS = value;
            break;
        case 'radarBeepVolume':
            if (RADAR_AUDIO_CONTROLLER != null)
                RADAR_AUDIO_CONTROLLER.setVolume(value);
    }
});

const GRID_SIZE = 10;


let LAYOUT = {};
function elementAdjusted(element) {
    if (LAYOUT[element.id] == undefined)
        LAYOUT[element.id] = [0, 0, 1];

    LAYOUT[element.id][0] = element.style.left;
    LAYOUT[element.id][1] = element.style.top;
    LAYOUT[element.id][2] = element.dataset.scale ?? 1;
}

function saveLayout() {
    ipcRenderer.send('set-hud-layout', JSON.stringify(LAYOUT));
}
ipcRenderer.on('save-hud-layout', saveLayout);


function loadLayout(layout) {
    LAYOUT = layout;
    for (const id of TRANSFORMABLES) {
        const element = document.getElementById(id);
        let left, top, scale;
        if (LAYOUT[id] != undefined) {
            [left, top, scale] = LAYOUT[id];
        } else {
            left = null;
            top = null;
            scale = null;
        }

        element.style.position = 'relative';
        element.style.left = left;
        element.style.top = top;
        element.style.transform = scale == null || scale === '' ? null : `scale(${scale})`;
        element.dataset.scale = scale;
    }
}

function requestLayout() {
    ipcRenderer.send('get-hud-layout');
}

ipcRenderer.on('hud-layout', (e, arg) => {
    loadLayout(JSON.parse(arg[0]));
});

function addTransformable(id) {
    const element = document.getElementById(id);

    // draggable
    const draggable = new agnosticDraggable.Draggable(element, {
        grid: [GRID_SIZE, GRID_SIZE],
        containment: 'window',
    }, {
        'drag:stop': (event) => elementAdjusted(event.source),
    });

    // resizable (scroll to scale)
    element.addEventListener('wheel', (e) => {
        const scale = -e.deltaY / 1000 + (parseFloat(element.dataset.scale) || 1);
        element.style.transform = `scale(${scale})`;
        element.dataset.scale = scale;
        elementAdjusted(element);
    });

    return draggable;
}


const TRANSFORMABLES = [
    'position-container',
    
    'last-lap-session-container',
    'best-lap-session-container',
    'time-left-container',

    'tires',
    'damage',
    'fuel-data',

    'radar',

    'relative-viewer',
    'driver-inputs',
    'basic',
];

document.addEventListener('DOMContentLoaded', () => {
    for (const id of TRANSFORMABLES) {
        addTransformable(id);
    }

    requestLayout();
});
