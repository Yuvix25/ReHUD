import {TransformableId, CHECK_FOR_UPDATES, SPEED_UNITS, PRESSURE_UNITS, RADAR_RANGE, RADAR_BEEP_VOLUME, HUD_LAYOUT, TRANSFORMABLES} from "./consts.js";
import {enableLogging} from "./utils.js";
import {ipcRenderer} from 'electron';

enableLogging(ipcRenderer, 'settingsPage.js');


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
  [HUD_LAYOUT]: processHudLayout,
};


/**
 * Callbacks for when a setting is changed.
 */
const valueChangeCallbacks: {[key: string] : (value: any) => void} = {
  [CHECK_FOR_UPDATES]: checkForUpdates,
};


function choiceValue(choiceSetting: HTMLDivElement, save: boolean = true) {
  const key = choiceSetting.dataset.key;

  const callback = valueChangeCallbacks[key];

  const buttons: NodeListOf<HTMLButtonElement> = choiceSetting.querySelectorAll('button');

  return (val: string) => {
    save && setSetting([key, val]);

    buttons.forEach((button) => {
      if (button.value === val) {
        button.classList.add('selected');
      } else {
        button.classList.remove('selected');
      }
    });

    if (typeof callback === 'function') {
      callback(val);
    }
  };
}

function sliderValue(sliderSetting: HTMLDivElement) {
  const key = sliderSetting.dataset.key;

  const callback = valueChangeCallbacks[key];
  
  const sliderInput: HTMLInputElement = sliderSetting.querySelector('input[type=range]');
  const numberInput: HTMLInputElement = sliderSetting.querySelector('input[type=number]');

  const min = parseFloat(sliderInput.min);
  const max = parseFloat(sliderInput.max);

  let lastVal = sliderInput.value;

  return (val: string) => {
    if (val === lastVal) return;
  
    if (parseFloat(val) < min) val = min.toString();
    if (parseFloat(val) > max) val = max.toString();

    lastVal = val;

    setSetting([key, val]);

    sliderInput.value = val;
    numberInput.value = val;

    if (typeof callback === 'function') {
      callback(val);
    }
  };
}

function toggleValue(toggleSetting: HTMLDivElement) {
  const key = toggleSetting.dataset.key;

  const callback = valueChangeCallbacks[key];

  const toggleInput: HTMLInputElement = toggleSetting.querySelector('input[type=checkbox]');

  return (val: boolean) => {
    toggleInput.checked = val;
    setSetting([key, val]);

    if (typeof callback === 'function') {
      callback(val);
    }
  };
}

let domContentLoaded = false;
document.addEventListener('DOMContentLoaded', () => {
  domContentLoaded = true;

  const choices: NodeListOf<HTMLDivElement> = document.querySelectorAll('div .choices');
  choices.forEach((choice) => {
    const buttons: NodeListOf<HTMLButtonElement> = choice.querySelectorAll('button');

    const choiceFunc = choiceValue(choice);
    buttons.forEach((button) => {
      button.addEventListener('click', () => choiceFunc(button.value));
    });
  });

  const sliders: NodeListOf<HTMLDivElement> = document.querySelectorAll('div .slider-setting');
  sliders.forEach((slider) => {
    const sliderInput: HTMLInputElement = slider.querySelector('input[type=range]');
    const numberInput: HTMLInputElement = slider.querySelector('input[type=number]');

    const sliderFunc = sliderValue(slider);
    sliderInput.addEventListener('input', () => sliderFunc(sliderInput.value));
    numberInput.addEventListener('input', () => sliderFunc(numberInput.value));
  });

  const toggles: NodeListOf<HTMLDivElement> = document.querySelectorAll('div .toggle');
  toggles.forEach((toggle) => {
    const toggleInput: HTMLInputElement = toggle.querySelector('input[type=checkbox]');

    const toggleFunc = toggleValue(toggle);
    toggleInput.addEventListener('input', () => toggleFunc(toggleInput.checked));
  });
});


function loadSettings(newSettings: Settings = null) {
  if (newSettings === null) {
    ipcRenderer.send('load-settings');
    return;
  }
  settings = newSettings;

  const load = () => {
    for (const key of Object.keys(settings) as (keyof Settings)[]) {
      if (settings.hasOwnProperty(key)) {
        if (loadSettingsMap.hasOwnProperty(key)) {
          // @ts-ignore
          loadSettingsMap[key](settings[key]);
        }
      }
    }

    const choices: NodeListOf<HTMLDivElement> = document.querySelectorAll('div .choices');
    choices.forEach((choice) => {
      const choiceFunc = choiceValue(choice);

      const key = choice.dataset.key;
      if (key in settings) {
        const val = (settings as any)[key];
        choiceFunc(val);
      } else {
        const defaultButton: HTMLButtonElement = choice.querySelector('button.selected');
        if (defaultButton) {
          choiceFunc(defaultButton.value);
        }
      }
    });

    const sliders: NodeListOf<HTMLDivElement> = document.querySelectorAll('div .slider-setting');
    sliders.forEach((slider) => {
      const sliderInput: HTMLInputElement = slider.querySelector('input[type=range]');

      const sliderFunc = sliderValue(slider);

      const key = slider.dataset.key;
      if (key in settings) {
        const val = (settings as any)[key];
        sliderFunc(val);
      } else {
        sliderFunc(sliderInput.value);
      }
    });

    const toggles: NodeListOf<HTMLDivElement> = document.querySelectorAll('div .toggle');
    toggles.forEach((toggle) => {
      const toggleInput: HTMLInputElement = toggle.querySelector('input[type=checkbox]');

      const toggleFunc = toggleValue(toggle);

      const key = toggle.dataset.key;
      if (key in settings) {
        const val = (settings as any)[key];
        toggleFunc(val);
      } else {
        toggleFunc(toggleInput.checked);
      }
    });
  }

  if (domContentLoaded) {
    load();
  } else {
    document.addEventListener('DOMContentLoaded', load);
  }
}


ipcRenderer.on('version', (e, v) => {
  const version = document.getElementById('version');
  version.innerText = 'v' + v;
});

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
  loadSettings();

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
    {id: 'show-log-file', func: () => ipcRenderer.send('show-log-file')},
    {id: 'general-tablink', func: (event: MouseEvent) => tabChange(event, 'general-tab')},
    {id: 'layout-tablink', func: (event: MouseEvent) => tabChange(event, 'layout-tab')},
  ];


  const oninput: {id: string, func: (e: HTMLInputElement) => void}[] = [];

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


let didCheckForUpdates = false;
function checkForUpdates(val: boolean) {
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

function setSetting(arg: [string, any]) {
  ipcRenderer.send('set-setting', arg);
}

