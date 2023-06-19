const {ipcRenderer} = require('electron');

let settings = {};

const writeSettingsMap = {
  'speedUnits': speedUnits,
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

function sendToMainWindow(arg) {
  ipcRenderer.send('set-setting', arg);
}

