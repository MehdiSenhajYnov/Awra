// Desktop shell for Steam / itch.io builds. Two shapes for one window:
// "full" (the keeper's cottage above the sea) and "strip" (a slim band docked at the bottom of the screen, always on top).
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

const STRIP_HEIGHT = 190;
let win = null;
let mode = 'full';
let onTop = true;

function fullBounds() {
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(1440, area.width);
  const height = Math.min(900, area.height);
  return { x: area.x + Math.round((area.width - width) / 2), y: area.y + Math.round((area.height - height) / 2), width, height };
}

function stripBounds() {
  const area = screen.getPrimaryDisplay().workArea;
  return { x: area.x, y: area.y + area.height - STRIP_HEIGHT, width: area.width, height: STRIP_HEIGHT };
}

function applyMode() {
  if (!win) return;
  if (mode === 'strip') {
    win.setMinimumSize(600, 120);
    win.setBounds(stripBounds());
    win.setAlwaysOnTop(onTop, 'floating');
    win.setSkipTaskbar(false);
  } else {
    win.setAlwaysOnTop(false);
    win.setMinimumSize(900, 600);
    win.setBounds(fullBounds());
  }
}

function createWindow() {
  win = new BrowserWindow({
    ...fullBounds(),
    frame: false,
    backgroundColor: '#10161f',
    title: 'Phare',
    icon: path.join(__dirname, '..', 'dist', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  if (process.argv.includes('--strip')) { mode = 'strip'; applyMode(); }
}

ipcMain.on('quit', () => app.quit());
ipcMain.on('minimize', () => win?.minimize());
ipcMain.on('mode', (_e, m) => { mode = m === 'strip' ? 'strip' : 'full'; applyMode(); });
ipcMain.on('ontop', (_e, on) => { onTop = !!on; if (mode === 'strip') win?.setAlwaysOnTop(onTop, 'floating'); });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
