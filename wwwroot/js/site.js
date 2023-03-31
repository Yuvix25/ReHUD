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

function lerpRGB3(color1, color2, color3, t) {
    if (t < 0.5) {
        return lerpRGB(color1, color2, t * 2);
    }
    return lerpRGB(color2, color3, (t - 0.5) * 2);
}

const root = document.querySelector(':root');
const VALUES = [
    new Value('speed', 'carSpeed', (x) => Math.round(x * 3.6)),
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

        if (current < upshift - (max - upshift) * 2) {
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

    new Value('tires', ['tireTemp'], (x) => {
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

            for (let i = 1; i <= 3; i++) {
                const side = ['left', 'center', 'right'][i - 1];
                const text = document.getElementById(`${name}-temp-${i}`);
                const progress = document.querySelector(`#${name}-${i} progress`);
                progress.value = 1;

                const temp = x?.[tire]?.currentTemp?.[side];

                if (temp == undefined) {
                    text.innerText = 'N/A';
                    root.style.setProperty(`--${name}-${i}-color`, 'var(--tire-temp-color-normal)');
                    continue;
                }
                
                text.innerText = `${Math.round(temp)}°`;
                
                if (optimal == undefined || cold == undefined || hot == undefined) {
                    root.style.setProperty(`--${name}-${i}-color`, 'var(--tire-temp-color-normal)');
                    continue;
                }

                root.style.setProperty(`--${name}-${i}-color`, lerpRGB([0, 0, 255], [0, 255, 0], (temp - cold) / (hot - cold)));
            }
        }
    }),
];

ipcRenderer.on('data', (event, data) => {
    data = data[0];
    for (const value of VALUES) {
        const element = document.getElementById(value.elementId);
        const newValue = value.getValueFromData(data);
        if (newValue !== undefined && element != null) {
            element.innerText = newValue;
        }
    }
});