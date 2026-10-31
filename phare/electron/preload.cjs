const { contextBridge, ipcRenderer } = require('electron');

// Window controls for the frameless desktop build (the web build has none of these).
contextBridge.exposeInMainWorld('phareDesktop', {
  quit: () => ipcRenderer.send('quit'),
  minimize: () => ipcRenderer.send('minimize'),
  setMode: (mode) => ipcRenderer.send('mode', mode),
  setOnTop: (on) => ipcRenderer.send('ontop', on),
});
