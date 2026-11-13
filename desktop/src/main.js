const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Sistema de Calidad de Leche - Fundo San Carlos",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // En desarrollo usa app.getAppPath(), en producción usa process.resourcesPath
  const rutaFrontend = app.isPackaged 
    ? path.join(process.resourcesPath, 'frontend', 'index.html')
    : path.join(app.getAppPath(), 'frontend', 'index.html');

  console.log("Cargando frontend desde:", rutaFrontend);
  win.loadFile(rutaFrontend);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});