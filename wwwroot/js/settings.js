const {ipcRenderer} = require('electron');

// document.addEventListener('DOMContentLoaded', () => utils.enableLogging(ipcRenderer, 'settings.js'));

const CHECK_FOR_UPDATES = "check-for-updates";
const SPEED_UNITS = "speedUnits";
const RADAR_BEEP_VOLUME = "radarBeepVolume";
const HUD_LAYOUT = "hudLayout";

let settings = {};

const loadSettingsMap = {
  [SPEED_UNITS]: speedUnits,
  [RADAR_BEEP_VOLUME]: radarBeepVolume,
  [CHECK_FOR_UPDATES]: checkForUpdates,
  [HUD_LAYOUT]: processHudLayout,
};


function loadSettings(newSettings) {
  settings = newSettings;
  for (const key in settings) {
    if (settings.hasOwnProperty(key)) {
      if (loadSettingsMap.hasOwnProperty(key)) {
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


function tabChange(event, tabId) {
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
  event.currentTarget.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  enableLogging(ipcRenderer, 'settings.js');

  const settingsBase64 = location.hash.substring(1);
  loadSettings(JSON.parse(Buffer.from(settingsBase64, 'base64').toString('utf8')));

  const elementToggles = document.getElementById('element-toggles');
  elementToggles.innerHTML = '';
  for (const key in TRANSFORMABLES) {
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
    { id: 'edit-layout', func: () => lockOverlay(true) },
    { id: 'cancel-reset-layout', func: () => lockOverlay(false) },
    { id: 'speed-units-kmh', func: () => speedUnits('kmh') },
    { id: 'speed-units-mph', func: () => speedUnits('mph') },
    { id: 'show-log-file', func: () => ipcRenderer.send('show-log-file') },
    { id: 'general-tablink', func: (event) => tabChange(event, 'general-tab') },
    { id: 'layout-tablink', func: (event) => tabChange(event, 'layout-tab') },
  ];

  const oninput = [
    { id: 'radar-beep-volume', func: (e) => radarBeepVolume(e.value) },
    { id: 'radar-beep-volume-text', func: (e) => radarBeepVolume(e.value) },
    { id: CHECK_FOR_UPDATES, func: (e) => checkForUpdates(e.checked) },
  ];

  onclick.forEach((o) => {
    document.getElementById(o.id)?.addEventListener('click', o.func);
  });
  oninput.forEach((o) => {
    const element = document.getElementById(o.id);
    element?.addEventListener('input', () => o.func(element));
  });
});


const EDIT_TEXT = 'Edit';
const SAVE_TEXT = 'Save';
const CANCEL_TEXT = 'Cancel';
const RESET_TEXT = 'Reset';
function lockOverlay(save) {
  const element = document.getElementById('edit-layout');
  const didEdit = element.innerText === EDIT_TEXT; // entered edit mode
  const cancelResetButton = document.getElementById('cancel-reset-layout');

  if (!save && cancelResetButton.innerText === RESET_TEXT) { // reset clicked
    ipcRenderer.send('reset-hud-layout');
  }

  const toggles = document.querySelectorAll('.element-toggle input');
  toggles.forEach((toggle) => {
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

function speedUnits(val) {
  setSetting([SPEED_UNITS, val]);
  val = val === 'mph';

  const kmh = document.getElementById('speed-units-kmh');
  const mph = document.getElementById('speed-units-mph');

  if (val) {
    kmh.classList.remove('selected');
    mph.classList.add('selected');
  } else {
    kmh.classList.add('selected');
    mph.classList.remove('selected');
  }
}

const MINIMUM_RADAR_BEEP_VOLUME = 0;
const MAXIMUM_RADAR_BEEP_VOLUME = 3;
function radarBeepVolume(val) {
  setSetting([RADAR_BEEP_VOLUME, val]);

  const volumeSlider = document.getElementById('radar-beep-volume');
  const volume = volumeSlider.nextElementSibling;

  volumeSlider.min = MINIMUM_RADAR_BEEP_VOLUME;
  volumeSlider.max = MAXIMUM_RADAR_BEEP_VOLUME;
  volume.min = MINIMUM_RADAR_BEEP_VOLUME;
  volume.max = MAXIMUM_RADAR_BEEP_VOLUME;
  volumeSlider.value = val;
  volume.value = val;
}


let didCheckForUpdates = false;
function checkForUpdates(val) {
  setSetting([CHECK_FOR_UPDATES, val]);

  const element = document.getElementById(CHECK_FOR_UPDATES);
  element.checked = val;

  if (val) {
    !didCheckForUpdates && ipcRenderer.send(CHECK_FOR_UPDATES);
    didCheckForUpdates = true;
  }
}


function toggleElement(event) {
  const element = event.target;
  const elementId = element.parentElement.id;

  ipcRenderer.send('toggle-element', [elementId, element.checked]);
}

function processHudLayout(hudLayout) {
  for (const id in TRANSFORMABLES) {
    const element = document.getElementById(id)?.children?.[0];
    if (!element) continue;
    if (hudLayout[id]?.[3] === false) {
      element.checked = false;
    } else {
      element.checked = true;
    }
  }
}

function setSetting(arg) {
  ipcRenderer.send('set-setting', arg);
}

