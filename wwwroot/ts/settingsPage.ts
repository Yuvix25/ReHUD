import {TransformableId, CHECK_FOR_UPDATES, SPEED_UNITS, PRESSURE_UNITS, RADAR_RANGE, RADAR_BEEP_VOLUME, HUD_LAYOUT, TRANSFORMABLES} from "./consts.js";
import {enableLogging} from "./utils.js";
import {ipcRenderer} from 'electron';

// document.addEventListener('DOMContentLoaded', () => utils.enableLogging(ipcRenderer, 'settingsPage.js'));

type Writeable<T> = {-readonly [P in keyof T]: T[P]};

export type HudLayout = {
  [key in Writeable<TransformableId>]?: [number, number, number, boolean];
};

type SpeedUnits = 'kmh' | 'mph';
type PressureUnits = 'kPa' | 'psi';

type Settings = {
  [CHECK_FOR_UPDATES]?: boolean,
  [SPEED_UNITS]?: SpeedUnits,
  [PRESSURE_UNITS]?: PressureUnits,
  [RADAR_RANGE]?: number,
  [RADAR_BEEP_VOLUME]?: number,
  [HUD_LAYOUT]?: HudLayout,
};

let settings: Settings = {};

const loadSettingsMap = {
  [SPEED_UNITS]: speedUnits,
  [PRESSURE_UNITS]: pressureUnits,
  [RADAR_RANGE]: sliderValue('radar-range', RADAR_RANGE),
  [RADAR_BEEP_VOLUME]: sliderValue('radar-beep-volume', RADAR_BEEP_VOLUME),
  [CHECK_FOR_UPDATES]: checkForUpdates,
  [HUD_LAYOUT]: processHudLayout,
};


function loadSettings(newSettings: Settings) {
  settings = newSettings;
  for (const key of Object.keys(settings) as (keyof Settings)[]) {
    if (settings.hasOwnProperty(key)) {
      if (loadSettingsMap.hasOwnProperty(key)) {
        // @ts-ignore
        loadSettingsMap[key](settings[key]);
      }
    }
  }
}

ipcRenderer.on('settings', (e, arg) => {
  loadSettings(JSON.parse(arg[0]));
});

ipcRenderer.on('hud-layout', (e, arg) => {
  settings[HUD_LAYOUT] = JSON.parse(arg[0]);
  processHudLayout(settings[HUD_LAYOUT]);
});


function tabChange(event: MouseEvent, tabId: string) {
  let i, tabcontent, tablinks;

  // This is to clear the previous clicked content.
  tabcontent = document.getElementsByClassName('tabcontent');
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].classList.remove('active');
  }

  // Set the tab to be 'active'.
  tablinks = document.getElementsByClassName('tablinks');
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active');
  }

  // Display the clicked tab and set it to active.
  const tabContent = document.getElementById(tabId);
  tabContent.classList.add('active');

  if (event.currentTarget instanceof HTMLElement) { // always true but otherwise TS complains
    event.currentTarget.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  enableLogging(ipcRenderer, 'settingsPage.js');

  const settingsBase64 = location.hash.substring(1);
  loadSettings(JSON.parse(Buffer.from(settingsBase64, 'base64').toString('utf8')));

  const elementToggles = document.getElementById('element-toggles');
  elementToggles.innerHTML = '';
  for (const key of Object.keys(TRANSFORMABLES) as TransformableId[]) {
    const toggleContainer = document.createElement('div');
    toggleContainer.classList.add('element-toggle');
    toggleContainer.id = key;
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = settings?.[HUD_LAYOUT]?.[key]?.[3] ?? true;
    toggle.disabled = true;
    toggle.onchange = toggleElement;

    const label = document.createElement('label');
    label.innerText = TRANSFORMABLES[key];
    label.htmlFor = key;

    toggleContainer.appendChild(toggle);
    toggleContainer.appendChild(label);

    elementToggles.appendChild(toggleContainer);
  }

  const onclick = [
    {id: 'edit-layout', func: () => lockOverlay(true)},
    {id: 'cancel-reset-layout', func: () => lockOverlay(false)},
    {id: 'speed-units-kmh', func: () => speedUnits('kmh')},
    {id: 'speed-units-mph', func: () => speedUnits('mph')},
    {id: 'pressure-units-kpa', func: () => pressureUnits('kPa')},
    {id: 'pressure-units-psi', func: () => pressureUnits('psi')},
    {id: 'show-log-file', func: () => ipcRenderer.send('show-log-file')},
    {id: 'general-tablink', func: (event: MouseEvent) => tabChange(event, 'general-tab')},
    {id: 'layout-tablink', func: (event: MouseEvent) => tabChange(event, 'layout-tab')},
  ];

  const oninput = [
    {id: 'radar-range', func: (e: HTMLInputElement) => loadSettingsMap[RADAR_RANGE](e.value)},
    {id: 'radar-range-text', func: (e: HTMLInputElement) => loadSettingsMap[RADAR_RANGE](e.value)},
    {id: 'radar-beep-volume', func: (e: HTMLInputElement) => loadSettingsMap[RADAR_BEEP_VOLUME](e.value)},
    {id: 'radar-beep-volume-text', func: (e: HTMLInputElement) => loadSettingsMap[RADAR_BEEP_VOLUME](e.value)},
    {id: CHECK_FOR_UPDATES, func: (e: HTMLInputElement) => checkForUpdates(e.checked)},
  ];

  onclick.forEach((o) => {
    document.getElementById(o.id)?.addEventListener('click', o.func);
  });
  oninput.forEach((o) => {
    const element: HTMLInputElement = document.querySelector("#" + o.id);
    if (element != null) {
      element.addEventListener('input', () => o.func(element));
    }
  });
});


const EDIT_TEXT = 'Edit';
const SAVE_TEXT = 'Save';
const CANCEL_TEXT = 'Cancel';
const RESET_TEXT = 'Reset';
function lockOverlay(save: boolean) {
  const element = document.getElementById('edit-layout');
  const didEdit = element.innerText === EDIT_TEXT; // entered edit mode
  const cancelResetButton = document.getElementById('cancel-reset-layout');

  if (!save && cancelResetButton.innerText === RESET_TEXT) { // reset clicked
    ipcRenderer.send('reset-hud-layout');
  }

  const toggles = document.querySelectorAll('.element-toggle input');
  toggles.forEach((toggle) => {
    if (toggle instanceof HTMLInputElement)
      toggle.disabled = !didEdit;
  });

  setTimeout(() => {
    ipcRenderer.send('lock-overlay', [!didEdit, save]);
  }, 150);

  if (didEdit) {
    element.innerText = SAVE_TEXT;
    cancelResetButton.innerText = CANCEL_TEXT;
  } else {
    element.innerText = EDIT_TEXT;
    cancelResetButton.innerText = RESET_TEXT;
  }
}

function speedUnits(val: SpeedUnits) {
  setSetting([SPEED_UNITS, val]);
  let isMph = val === 'mph';

  const kmh = document.getElementById('speed-units-kmh');
  const mph = document.getElementById('speed-units-mph');

  // @ts-ignore
  choiceButtons(isMph, mph, kmh);
}

function pressureUnits(val: PressureUnits) {
  setSetting([PRESSURE_UNITS, val]);
  let isKpa = val === 'kPa';

  const kPa = document.getElementById('pressure-units-kpa');
  const psi = document.getElementById('pressure-units-psi');

  // @ts-ignore
  choiceButtons(isKpa, kPa, psi);
}

function choiceButtons(val: boolean, button1: HTMLButtonElement, button2: HTMLButtonElement) {
  if (val) {
    button2.classList.remove('selected');
    button1.classList.add('selected');
  } else {
    button2.classList.add('selected');
    button1.classList.remove('selected');
  }
}

function sliderValue(id: string, setting: keyof Settings) {
  return (val: string) => {
    setSetting([setting, val]);

    const slider: HTMLInputElement = document.querySelector("#" + id);
    // @ts-ignore
    const text: HTMLInputElement = slider.nextElementSibling;

    slider.value = val;
    text.value = val;
  };
}


let didCheckForUpdates = false;
function checkForUpdates(val: boolean) {
  setSetting([CHECK_FOR_UPDATES, val]);

  const element: HTMLInputElement = document.querySelector("#" + CHECK_FOR_UPDATES);
  element.checked = val;

  if (val) {
    !didCheckForUpdates && ipcRenderer.send(CHECK_FOR_UPDATES);
    didCheckForUpdates = true;
  }
}


function toggleElement(event: Event) {
  // @ts-ignore
  const element: HTMLInputElement = event.target;
  const elementId = element.parentElement.id;

  ipcRenderer.send('toggle-element', [elementId, element.checked]);
}

function processHudLayout(hudLayout: HudLayout) {
  for (const id of Object.keys(TRANSFORMABLES) as TransformableId[]) {
    // @ts-ignore
    const element: HTMLInputElement = document.getElementById(id)?.children?.[0];
    if (!element) continue;
    if (hudLayout[id]?.[3] === false) {
      element.checked = false;
    } else {
      element.checked = true;
    }
  }
}

function setSetting(arg: [keyof Settings, any]) {
  ipcRenderer.send('set-setting', arg);
}

