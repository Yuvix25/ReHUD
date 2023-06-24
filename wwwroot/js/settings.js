const {ipcRenderer} = require('electron');
const { remote } = require('electron');

// document.addEventListener('DOMContentLoaded', () => utils.enableLogging(ipcRenderer, 'settings.js'));
document.addEventListener('DOMContentLoaded', () => enableLogging(ipcRenderer, 'settings.js'));


let settings = {};

const writeSettingsMap = {
  'speedUnits': speedUnits,
  'radarBeepVolume': radarBeepVolume,
};


function setSettings(newSettings) {
  settings = newSettings;
  for (const key in settings) {
    if (settings.hasOwnProperty(key)) {
      if (writeSettingsMap.hasOwnProperty(key)) {
        writeSettingsMap[key](settings[key]);
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const settingsBase64 = location.hash.substring(1);
  setSettings(JSON.parse(Buffer.from(settingsBase64, 'base64').toString('utf8')));

  const onclick = [
    { id: 'edit-layout', func: () => lockOverlay(true) },
    { id: 'cancel-reset-layout', func: () => lockOverlay(false) },
    { id: 'speed-units-kmh', func: () => speedUnits('kmh') },
    { id: 'speed-units-mph', func: () => speedUnits('mph') },
    { id: 'show-log-file', func: () => ipcRenderer.send('show-log-file') },
  ];

  const oninput = [
    { id: 'radar-beep-volume', func: (v) => radarBeepVolume(v) },
    { id: 'radar-beep-volume-text', func: (v) => radarBeepVolume(v) },
  ];

  onclick.forEach((o) => {
    const element = document.getElementById(o.id);
    if (element) {
      element.addEventListener('click', o.func);
    }
  });
  oninput.forEach((o) => {
    const element = document.getElementById(o.id);
    if (element) {
      element.addEventListener('input', () => o.func(element.value));
    }
  });
});


const EDIT_TEXT = 'Edit';
const SAVE_TEXT = 'Save';
const CANCEL_TEXT = 'Cancel';
const RESET_TEXT = 'Reset';
function lockOverlay(save) {
  const element = document.getElementById('edit-layout');
  const didEdit = element.innerText === EDIT_TEXT;
  const cancelResetButton = document.getElementById('cancel-reset-layout');

  let doEdit;
  if (!save && cancelResetButton.innerText === RESET_TEXT) {
    doEdit = true;
    ipcRenderer.send('reset-hud-layout');
  } else {
    ipcRenderer.send('lock-overlay', [!didEdit, save]);

    doEdit = didEdit;
  }

  if (doEdit) {
    element.innerText = SAVE_TEXT;
    cancelResetButton.innerText = CANCEL_TEXT;
  } else {
    element.innerText = EDIT_TEXT;
    cancelResetButton.innerText = RESET_TEXT;
  }
}

function speedUnits(val) {
  sendToMainWindow(['speedUnits', val]);
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
  sendToMainWindow(['radarBeepVolume', val]);

  const volumeSlider = document.getElementById('radar-beep-volume');
  const volume = volumeSlider.nextElementSibling;

  volumeSlider.min = MINIMUM_RADAR_BEEP_VOLUME;
  volumeSlider.max = MAXIMUM_RADAR_BEEP_VOLUME;
  volume.min = MINIMUM_RADAR_BEEP_VOLUME;
  volume.max = MAXIMUM_RADAR_BEEP_VOLUME;
  volumeSlider.value = val;
  volume.value = val;

}

function sendToMainWindow(arg) {
  ipcRenderer.send('set-setting', arg);
}

