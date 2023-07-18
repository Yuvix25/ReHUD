/* ========================================== Constants ========================================== */

const GRID_SIZE = 10;
const DEFAULT_RENDER_CYCLE = 30;
const ITERATION_CYCLE = 1000;

const INC_POINTS_RED_THRESHOLD = 4; // will be red if maxIncidents - currentIncidents >= this value

const RADAR_RADIUS = 12; // meters
const RADAR_BEEP_MIN_SPEED = 15; // km/h

const LAST_LAP_SECTORS_TIME_ON_SCREEN = 3; // seconds


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



/* ========================================== Functions ========================================== */


function valueIsValid(val) {
    return val != undefined && val != -1;
}

const laptimeFormat = (time) => {
    if (!valueIsValid(time))
        return '-:--.---';

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time - Math.floor(time)) * 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

const mapSectorTimes = (sectorTimes) => {
    if (sectorTimes == null)
        return null;
    const res = [sectorTimes.sector1, sectorTimes.sector2, sectorTimes.sector3];
    if (valueIsValid(res[0]) && valueIsValid(res[1])) {
        res[1] -= res[0];

        if (valueIsValid(res[1]) && valueIsValid(res[2])) {
            res[2] -= res[1];
            res[2] -= res[0];
        }
    }
    return res;
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
