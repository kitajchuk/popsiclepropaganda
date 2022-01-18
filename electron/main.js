// https://electron.guide/final-polish/renderer/#prevent-browserwindow-refreshes

// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isMac = (process.platform === 'darwin');
const isProd = (process.env.NODE_ENV === 'production');
const {
  default: installExtension,
  REDUX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS
} = require('electron-devtools-installer');

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: 'popsiclepropaganda',
    width: 2560,
    height: 1440,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: !isProd,
    },
    backgroundColor: '#000000',
  });

  // and load the index.html of the app.
  if (isProd) {
    // React app static
    mainWindow.loadFile('./build/index.html');

    // Disable menus
    if (isMac) {
      Menu.setApplicationMenu(Menu.buildFromTemplate([]));
    } else {
      mainWindow.removeMenu();
    }
  } else {
    // React app dev server
    mainWindow.loadURL('http://localhost:3000');

    // Open the DevTools.
    mainWindow.webContents.once('dom-ready', async () => {
      await installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
              .then((name) => console.log(`Added Extension:  ${name}`))
              .catch((err) => console.log("An error occurred: ", err))
              .finally(() => {
                mainWindow.webContents.openDevTools();
              });
    });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (isMac) app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.