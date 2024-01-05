import {ipcRenderer} from 'electron';

import EventEmitter from './EventEmitter.js';
import Draggable, {DraggableEvent, TransformableHTMLElement} from './Draggable.js';
import Hud from './Hud.js';
import {IExtendedDriverInfo, computeUid, enableLogging} from './utils.js';
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
import {ELEMENT_SCALE_POWER, IExtendedShared, TRANSFORMABLES, TransformableId} from './consts.js';
import TractionControl from './hudElements/TractionControl.js';
import PositionBar from './hudElements/PositionBar.js';
import CurrentLaptime from './hudElements/CurrentLaptime.js';
import StrengthOfField from './hudElements/StrengthOfField.js';
import AlltimeBestLap from './hudElements/AlltimeBestLap.js';
import PitTimer from './hudElements/PitTimer.js';
import CompletedLaps from './hudElements/CompletedLaps.js';
import Rake from './hudElements/Rake.js';
import DRS from './hudElements/Drs.js';
import P2P from './hudElements/PushToPass.js';

enableLogging(ipcRenderer, 'index.js');

const hud = new Hud([
    new CarSpeed({name: 'CarSpeed', elementId: 'speed', renderEvery: 0}),
    new Gear({name: 'Gear', elementId: 'gear', renderEvery: 0}),
    new Assists({name: 'Assists', elementId: 'assist', renderEvery: 0}),
    new EngineMap({name: 'EngineMap', elementId: 'engine-map', renderEvery: 0}),
    new EngineBraking({name: 'EngineBraking', elementId: 'engine-brake', renderEvery: 500}),
    new BrakeBias({name: 'BrakeBias', elementId: 'brake-bias', renderEvery: 0}),
    new TractionControl({name: 'TractionControl', elementId: 'traction-control', renderEvery: 0}),
    new Revs({name: 'Revs', elementId: 'revs', renderEvery: 0}),
    new DriverInputs({name: 'DriverInputs', elementId: 'inputs', renderEvery: 0}),

    new PositionBar({name: 'PositionBar', elementId: 'position-bar', renderEvery: 80}),
    new RelativeViewer({name: 'RelativeViewer', elementId: 'relative-viewer', renderEvery: 80}),

    new FuelLeft({name: 'FuelLeft', elementId: 'fuel-left', renderEvery: 200}),
    new FuelPerLap({name: 'FuelPerLap', elementId: 'fuel-per-lap', renderEvery: 200}),
    new FuelLapsLeft({name: 'FuelLapsLeft', elementId: 'fuel-laps', renderEvery: 200}),
    new FuelTimeLeft({name: 'FuelTimeLeft', elementId: 'fuel-time', renderEvery: 200}),
    new FuelLastLap({name: 'FuelLastLap', elementId: 'fuel-last-lap', renderEvery: 200}),
    new FuelToEnd({name: 'FuelToEnd', elementId: 'fuel-to-end', renderEvery: 200}),
    new FuelToAdd({name: 'FuelToAdd', elementId: 'fuel-to-add', renderEvery: 200}),
    new FuelElement({name: 'FuelElement', elementId: 'fuel-data', renderEvery: 200}),

    new Tires({name: 'Tires', elementId: 'tires', renderEvery: 0}),
    new Damage({name: 'Damage', elementId: 'damage', renderEvery: 0}),

    new TimeLeft({name: 'TimeLeft', containerId: 'time-left-container', elementId: 'time-laps-left', renderEvery: 80}),
    new EstimatedLapsLeft({name: 'EstimatedLapsLeft', containerId: 'estimated-laps-left-container', elementId: 'estimated-laps-left', renderEvery: 100}),
    new StrengthOfField({name: 'StrengthOfField', elementId: 'strength-of-field', renderEvery: 500}),
    new SessionLastLap({name: 'SessionLastLaps', elementId: 'last-lap-session', renderEvery: 200}),
    new SessionBestLap({name: 'SessionBestLap', elementId: 'best-lap-session', renderEvery: 200}),
    new AlltimeBestLap({name: 'AlltimeBestLap', elementId: 'best-lap-alltime', renderEvery: 200}),

    new Position({name: 'Position', containerId: 'position-container', elementId: 'position', renderEvery: 0}),
    new CompletedLaps({name: 'CompletedLaps', containerId: 'completed-laps-container', elementId: 'completed-laps', renderEvery: 100}),
    new CurrentLaptime({name: 'CurrentLaptime', elementId: 'current-laptime', renderEvery: 0}),
    new IncidentPoints({name: 'IncidentPoints', containerId: 'incident-points-container', elementId: 'incident-points', renderEvery: 0}),

    new Radar({name: 'Radar', elementId: 'radar', renderEvery: 0}),

    new Delta({name: 'Delta', containerId: 'delta', elementId: 'delta-number', renderEvery: 50}),
    new SectorTimes({name: 'SectorTimes', containerId: 'sector-times', renderEvery: 0}),
    new PitTimer({name: 'PitTimer', containerId: 'pit-timer', elementId: 'pit-time-left', renderEvery: 0}),

    new Rake({name: 'Rake',containerId:'rake', elementId: 'rake-bar-number', renderEvery: 100}),

    new DRS({name: 'DRS', containerId: 'drs', elementId: 'drs-left', renderEvery: 50}),
    new P2P({name: 'P2P', containerId: 'p2p', elementId: 'p2p-left', renderEvery: 50}),
]);

(window as any).hud = hud;

let layoutLoaded = false;
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
    if (!hud.isInEditMode()) {
        console.warn('elementToggled called while not in edit mode');
        return;
    }

    if (shown && LAYOUT[elementId]?.[3] === false) {
        delete LAYOUT[elementId];
    } else {
        if (LAYOUT[elementId] == undefined)
            LAYOUT[elementId] = [0, 0, 1, true];

        LAYOUT[elementId][3] = shown;
    }

    const element = document.getElementById(elementId);
    if (element == null) {
        console.warn(`elementToggled called with invalid element id ${elementId}`);
        return;
    }

    loadLayout();
}

function saveLayout() {
    hud.setIsInEditMode(false);
    exitEditMode();
    ipcRenderer.send('set-hud-layout', JSON.stringify(LAYOUT));
}
ipcRenderer.on('save-hud-layout', saveLayout);

ipcRenderer.on('toggle-element', (event, arg) => {
    elementToggled(arg[0], arg[1]);
});

function loadLayout(layout?: HudLayout) {
    if (layout == undefined)
        layout = LAYOUT;
    const prevLayout = LAYOUT;
    LAYOUT = layout;
    for (const id of Object.keys(TRANSFORMABLES) as TransformableId[]) {
        const element = document.getElementById(id);
        let left, top, scale: string | number, shown;
        if (LAYOUT[id] != undefined) {
            [left, top, scale, shown] = LAYOUT[id];

            if (!prevLayout[id]?.[3] && shown && layoutLoaded) {
                left = null;
                top = null;
                scale = 1;

                delete LAYOUT[id];
            } else {
                element.classList.add('dragged');
            }
        } else {
            left = null;
            top = null;
            scale = 1;
            shown = true;

            element.classList.remove('dragged');
        }

        element.style.left = left == null ? null : left + 'px';
        element.style.top = top == null ? null : top + 'px';
        element.style.scale = isNaN(scale) ? null : Math.pow(parseFloat(scale.toString()), ELEMENT_SCALE_POWER).toString();
        element.dataset.scale = scale.toString();

        element.classList.remove('hidden');
        if (!shown) {
            element.classList.add('hidden');
        }
    }

    layoutLoaded = true;
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
        element.style.scale = scale.toString();
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
    if (!hud.isInEditMode()) {
        isShown = false;
        document.body.style.display = 'none';
    } else {
        hud.addOnEditModeChangedListener((isInEditMode) => {
            if (!isInEditMode) {
                hideHUD();
                return false;
            }
            return true;
        });
    }
}


function enterEditMode() {
    hud.setIsInEditMode(true);
}

function exitEditMode() {
    hud.setIsInEditMode(false);
    ipcRenderer.send('request-layout-visibility');
}


ipcRenderer.on('hide', hideHUD);
ipcRenderer.on('show', showHUD);

ipcRenderer.on('edit-mode', () => {
    enterEditMode();
    showHUD();
});



ipcRenderer.on('hud-layout', (e, arg) => {
    exitEditMode();
    loadLayout(JSON.parse(arg[0]));
});


ipcRenderer.on('data', (event, data_: string) => {
    let data = JSON.parse(data_[0]) as IExtendedShared;

    for (const driver of data.rawData.driverData) {
        (driver.driverInfo as IExtendedDriverInfo).uid = computeUid(driver.driverInfo);
    }

    EventEmitter.cycle(data.rawData);
    hud.render(data, data.forceUpdateAll, isShown);
});
hideHUD();

ipcRenderer.on('set-setting', (e, arg) => {
    const [key, value] = JSON.parse(arg);

    SettingsValue.set(key, value);
});

ipcRenderer.on('settings', (e, arg) => {
    SettingsValue.loadSettings(JSON.parse(arg));
});

ipcRenderer.send('load-settings');

document.addEventListener('DOMContentLoaded', () => {

    for (const id of Object.keys(TRANSFORMABLES) as TransformableId[]) {
        addTransformable(id);
    }

    requestLayout();
});
