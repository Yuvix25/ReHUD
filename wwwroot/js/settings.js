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

function lockOverlay(save) {
  const element = document.getElementById('edit-layout');
  const val = element.innerText === 'Edit';

  const cancelButton = document.getElementById('cancel-layout');
  if (val) {
    element.innerText = 'Save';
    cancelButton.style.display = 'inline-block';
  } else {
    element.innerText = 'Edit';
    cancelButton.style.display = 'none';
  }

  ipcRenderer.send('lock-overlay', [!val, save]);
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

