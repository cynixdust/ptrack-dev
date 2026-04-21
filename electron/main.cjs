const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

// Start the Express server
if (!isDev) {
  // In production, we run the server from the bundled version
  // This assumes server.cjs is bundled
  require('../server.cjs');
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  // If we are in dev, load the dev server URL
  // Otherwise, load the local server URL provided by our express app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  // Remove menu in production
  if (!isDev) {
    mainWindow.setMenu(null);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
