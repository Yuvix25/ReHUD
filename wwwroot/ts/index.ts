// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

import {ipcRenderer} from 'electron';

import EventEmitter from './EventEmitter.js';
import Draggable, {DraggableEvent, TransformableHTMLElement} from './Draggable.js';
import Hud from './Hud.js';
import {Driver, enableLogging} from './utils.js';
import {HudLayout} from './settingsPage.js';
import CarSpeed from './hudElements/CarSpeed.js';
import Gear from './hudElements/Gear.js';
import EngineMap from './hudElements/EngineMap.js';
import EngineBraking from './hudElements/EngineBraking.js';
import BrakeBias from './hudElements/BrakeBias.js';
import Revs from './hudElements/Revs.js';
import FuelLeft from './hudElements/FuelLeft.js';
import FuelPerLap from './hudElements/FuelPerLap.js';
import FuelLapsLeft from './hudElements/FuelLapsLeft.js';
import FuelTimeLeft from './hudElements/FuelTimeLeft.js';
import FuelLastLap from './hudElements/FuelLastLap.js';
import FuelToEnd from './hudElements/FuelToEnd.js';
import FuelToAdd from './hudElements/FuelToAdd.js';
import FuelElement from './hudElements/FuelElement.js';
import Tires from './hudElements/Tires.js';
import DriverInputs from './hudElements/DriverInputs.js';
import Damage from './hudElements/Damage.js';
import Assists from './hudElements/Assists.js';
import RelativeViewer from './hudElements/RelativeViewer.js';
import TimeLeft from './hudElements/TimeLeft.js';
import EstimatedLapsLeft from './hudElements/EstimatedLapsLeft.js';
import SessionLastLap from './hudElements/SessionLastLap.js';
import SessionBestLap from './hudElements/SessionBestLap.js';
import Position from './hudElements/Position.js';
import Radar from './hudElements/Radar.js';
import IncidentPoints from './hudElements/IncidentPoints.js';
import SectorTimes from './hudElements/SectorTimes.js';
import Delta from './hudElements/Delta.js';
import SettingsValue from './SettingsValue.js';
import {ELEMENT_SCALE_POWER, TRANSFORMABLES, TransformableId} from './consts.js';
import TractionControl from './hudElements/TractionControl.js';
import DriverManager from './actions/DriverManager.js';

enableLogging(ipcRenderer, 'index.js');

const driverManager = new DriverManager(0);
const relativeViewer = new RelativeViewer(driverManager, {elementId: 'relative-viewer', renderEvery: 80});
const hud = new Hud([
    driverManager,

    new CarSpeed({elementId: 'speed', renderEvery: 80}),
    new Gear({elementId: 'gear', renderEvery: 50}),
    new Assists({elementId: 'assist', renderEvery: 0}),
    new EngineMap({elementId: 'engine-map', renderEvery: 50}),
    new EngineBraking({elementId: 'engine-brake', renderEvery: 50}),
    new BrakeBias({elementId: 'brake-bias', renderEvery: 50}),
    new TractionControl({elementId: 'traction-control', renderEvery: 50}),
    new Revs({elementId: 'revs', renderEvery: 0}),
    new DriverInputs({elementId: 'inputs', renderEvery: 0}),

    relativeViewer,

    new FuelLeft({elementId: 'fuel-left', renderEvery: 500}),
    new FuelPerLap({elementId: 'fuel-per-lap', renderEvery: 500}),
    new FuelLapsLeft({elementId: 'fuel-laps', renderEvery: 500}),
    new FuelTimeLeft({elementId: 'fuel-time', renderEvery: 500}),
    new FuelLastLap({elementId: 'fuel-last-lap', renderEvery: 200}),
    new FuelToEnd({elementId: 'fuel-to-end', renderEvery: 500}),
    new FuelToAdd({elementId: 'fuel-to-add', renderEvery: 500}),
    new FuelElement({elementId: 'fuel-data', renderEvery: 500}),

    new Tires({elementId: 'tires', renderEvery: 50}),
    new Damage({elementId: 'damage', renderEvery: 100}),

    new TimeLeft({containerId: 'time-left-container', elementId: 'time-laps-left', renderEvery: 80}),
    new EstimatedLapsLeft({containerId: 'estimated-laps-left-container', elementId: 'estimated-laps-left', renderEvery: 100}),
    new SessionLastLap({elementId: 'last-lap-session', renderEvery: 200}),
    new SessionBestLap({elementId: 'best-lap-session', renderEvery: 200}),
    new Position({containerId: 'position-container', elementId: 'position', renderEvery: 100}),
    new IncidentPoints({containerId: 'incident-points-container', elementId: 'incident-points', renderEvery: 100}),

    new Radar({elementId: 'radar', renderEvery: 0}),

    new Delta({containerId: 'delta', elementId: 'delta-number', renderEvery: 50}),
    new SectorTimes({containerId: 'sector-times', renderEvery: 50}),
]);



// used for debugging
let lastData = null;

// {id: [left, top, scale, shown]}
let LAYOUT: HudLayout = {};


function elementAdjusted(event: DraggableEvent, position=true) {
    const element = event.source;
    if (LAYOUT[element.id] == undefined)
        LAYOUT[element.id] = [0, 0, 1, true];

    let scale = 1;
    if (!isNaN(element.dataset.scale as any)) {
        scale = parseFloat(element.dataset.scale);
    }
    LAYOUT[element.id][2] = scale;

    if (position) {
        LAYOUT[element.id][0] = event.left;
        LAYOUT[element.id][1] = event.top;

        element.style.left = event.left + 'px';
        element.style.top = event.top + 'px';

        element.classList.add('dragged');
    }
    
    element.classList.remove('hidden');
    if (!LAYOUT[element.id][3]) {
        element.classList.add('hidden');
    }
}

function elementToggled(elementId: TransformableId, shown: boolean) {
    if (!hud.isInEditMode) {
        console.warn('elementToggled called while not in edit mode');
        return;
    }

    if (LAYOUT[elementId] == undefined)
        LAYOUT[elementId] = [0, 0, 1, true];

    LAYOUT[elementId][3] = shown;

    const element = document.getElementById(elementId);
    if (element == null) {
        console.warn(`elementToggled called with invalid element id ${elementId}`);
        return;
    }

    element.classList.remove('hidden');
    if (!shown) {
        element.classList.add('hidden');
    }
}

function saveLayout() {
    hud.isInEditMode = false;
    exitEditMode();
    ipcRenderer.send('set-hud-layout', JSON.stringify(LAYOUT));
}
ipcRenderer.on('save-hud-layout', saveLayout);

ipcRenderer.on('toggle-element', (event, arg) => {
    elementToggled(arg[0], arg[1]);
});

function loadLayout(layout: HudLayout) {
    LAYOUT = layout;
    for (const id of Object.keys(TRANSFORMABLES) as TransformableId[]) {
        const element = document.getElementById(id);
        let left, top, scale: string | number, shown;
        if (LAYOUT[id] != undefined) {
            [left, top, scale, shown] = LAYOUT[id];

            element.classList.add('dragged');
        } else {
            left = null;
            top = null;
            scale = 1;
            shown = true;

            element.classList.remove('dragged');
        }

        element.style.left = left == null ? null : left + 'px';
        element.style.top = top == null ? null : top + 'px';
        element.style.transform = isNaN(scale) ? null : `scale(${Math.pow(parseFloat(scale.toString()), ELEMENT_SCALE_POWER)})`;
        element.dataset.scale = scale.toString();

        element.classList.remove('hidden');
        if (!shown) {
            element.classList.add('hidden');
        }
    }
}

function requestLayout() {
    ipcRenderer.send('get-hud-layout');
}

function addTransformable(id: TransformableId) {
    // @ts-ignore
    const element: TransformableHTMLElement = document.getElementById(id);

    // draggable
    const draggable = new Draggable(element, {
        'drag:start': (event) => element.classList.add('dragged'),
        'drag:stop': (event) => elementAdjusted(event),
    });

    // resizable (scroll to scale)
    element.addEventListener('wheel', (e) => {
        let scale = Math.max(0.55, -e.deltaY / 2000 + (parseFloat(element.dataset.scale) || 1));
        element.dataset.scale = scale.toString();
        scale = Math.pow(scale, ELEMENT_SCALE_POWER);
        element.style.transform = `scale(${scale})`;
        elementAdjusted({source: element, left: null, top: null}, false);
    });

    return draggable;
}

let isShown = true;
function showHUD() {
    isShown = true;
    document.body.style.display = 'block';
}

function hideHUD() {
    isShown = false;
    document.body.style.display = 'none';
}


function enterEditMode() {
    hud.isInEditMode = true;
}

function exitEditMode() {
    hud.isInEditMode = false;
    ipcRenderer.send('request-layout-visibility');
}


ipcRenderer.on('hide', hideHUD);
ipcRenderer.on('show', showHUD);

ipcRenderer.on('settings', (e, arg) => {
    const dataBase64 = Buffer.from(arg[0]).toString('base64');
    location.href = '/Settings#' + dataBase64;
});

ipcRenderer.on('edit-mode', () => {
    enterEditMode();
    showHUD();
});


ipcRenderer.send('whoami');


ipcRenderer.on('hud-layout', (e, arg) => {
    exitEditMode();
    loadLayout(JSON.parse(arg[0]));
});



ipcRenderer.on('data', (event, data) => {
    data = data[0];

    EventEmitter.cycle(data.rawData);
    hud.render(data, data.forceUpdateAll, isShown);

    lastData = data;
});

hideHUD();

ipcRenderer.on('set-setting', (e, arg) => {
    const [key, value] = JSON.parse(arg);

    SettingsValue.set(key, value);
});

document.addEventListener('DOMContentLoaded', () => {

    for (const id of Object.keys(TRANSFORMABLES) as TransformableId[]) {
        addTransformable(id);
    }

    requestLayout();

});
