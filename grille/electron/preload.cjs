const { contextBridge, ipcRenderer } = require('electron');

// Lets the title screen offer a "Quit" button in the desktop build only.
contextBridge.exposeInMainWorld('grilleDesktop', {
  quit: () => ipcRenderer.send('quit'),
});
