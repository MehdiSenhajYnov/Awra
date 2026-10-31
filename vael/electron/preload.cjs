const { contextBridge, ipcRenderer } = require('electron');

// Lets the title screen offer a "Quit" button in the desktop build only.
contextBridge.exposeInMainWorld('vaelDesktop', {
  quit: () => ipcRenderer.send('quit'),
});
