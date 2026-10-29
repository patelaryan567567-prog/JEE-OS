const path = require('node:path');
const { app, BrowserWindow, dialog, Menu, shell } = require('electron');

const SERVER_PORT = 3210;
let server;
let mainWindow;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

async function createWindow() {
  if (!server) {
    process.env.NODE_ENV = 'production';
    process.env.STUDYOS_WEB_DIST = path.join(app.getAppPath(), 'dist');
    const { startServer } = await import('../dist-electron/server.mjs');
    server = await startServer({ port: SERVER_PORT, host: '127.0.0.1' });
  }

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('StudyOS local server did not provide a usable address.');
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#09090b',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  await mainWindow.loadURL(`http://127.0.0.1:${address.port}`);
}

if (hasSingleInstanceLock) {
  app.whenReady().then(async () => {
    try {
      Menu.setApplicationMenu(null);
      await createWindow();
    } catch (error) {
      dialog.showErrorBox(
        'StudyOS could not start',
        error instanceof Error ? error.message : String(error),
      );
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error) => {
        dialog.showErrorBox(
          'StudyOS could not start',
          error instanceof Error ? error.message : String(error),
        );
      });
    }
  });
}

app.on('before-quit', () => {
  server?.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
