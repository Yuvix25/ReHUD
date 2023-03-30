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

const VALUES = [
    new Value('speed', 'carSpeed', (x) => Math.round(x * 3.6)),
    new Value('gear', 'gear', (x) => x == undefined || x == 0 ? 'N' : x == -1 ? 'R' : x),
    new Value('engine-map', 'engineMapSetting', (x) => `EM: ${x == -1 ? 5 : x}`),
    new Value('traction-control', ['tractionControlSetting', 'tractionControlPercent'], (x, y) =>
                `TC${x}` + (y == undefined ? `` : `: ${Math.round(y)}%`)),
    new Value('engine-brake', 'engineBrakeSetting', (x) => `EB: ${x}`),
    new Value('brake-bias', 'brakeBias', (x) => `BB: ${(100 - x * 100).toFixed(1)}%`),
    new Value('revs', ['engineRps', 'maxEngineRps', 'upshiftRps'], (current, max, upshift, id) => {
        document.getElementById(id).value = current;
        document.getElementById(id).max = max;

        const root = document.querySelector(':root');
        if (current < upshift - (max - upshift) * 2) {
            root.style.setProperty('--revs-color', 'var(--revs-color-normal)');
        } else if (current < upshift) {
            root.style.setProperty('--revs-color', 'var(--revs-color-upshift)');
        } else {
            root.style.setProperty('--revs-color', 'var(--revs-color-redline)');
        }
    }),

    new Value('fuel-left', 'fuelLeft', (x) => `${x.toFixed(1)}`),
    new Value('fuel-per-lap', '+fuelPerLap', (x) => `${x.toFixed(2)}`),
];

ipcRenderer.on('data', (event, data) => {
    data = data[0];
    for (const value of VALUES) {
        const element = document.getElementById(value.elementId);
        if (element === null) {
            continue;
        }
        const newValue = value.getValueFromData(data);
        if (newValue !== undefined) {
            element.innerText = newValue;
        }
    }
});