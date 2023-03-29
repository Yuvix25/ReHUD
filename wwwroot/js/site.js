// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

const {ipcRenderer} = require('electron');



class Value {
    constructor(valuesNames, valueMap=null) {
        this.valueNames = typeof valuesNames === 'string' ? [valuesNames] : valuesNames;
        this.valueMap = valueMap ?? ((x) => x);
    }

    getValueFromData(data) {
        const values = [];
        for (const valueName of this.valueNames) {
            values.push(data[valueName]);
            if (values[values.length - 1] === undefined) {
                return undefined;
            }
        }
        return this.valueMap(...values);
    }
}

const VALUES = {
    'speed': new Value('carSpeed', (x) => Math.round(x * 3.6)),
    'gear': new Value('gear', (x) => x == -1 ? 'R' : x == 0 ? 'N' : x),
    'engine-map': new Value('engineMapSetting', (x) => `EM: ${x == -1 ? 5 : x}`),
    'traction-control': new Value(['tractionControlSetting', 'tractionControlPercent'], (x, y) => `TC${x}: ${Math.round(y)}%`),
    'engine-brake': new Value('engineBrakeSetting', (x) => `EB: ${x}`),
    'brake-bias': new Value('brakeBias', (x) => `BB: ${(100 - x * 100).toFixed(1)}%`),
}

ipcRenderer.on('data', (event, data) => {
    data = data[0];
    for (const [key, value] of Object.entries(VALUES)) {
        const element = document.getElementById(key);
        if (element === null) {
            continue;
        }
        const newValue = value.getValueFromData(data);
        if (newValue !== undefined) {
            element.innerText = newValue;
        }
    }
});