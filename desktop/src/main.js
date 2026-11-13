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

  // Construir la ruta absoluta al frontend
  // app.getAppPath() devuelve la raíz del proyecto (backend-calidad-leche)
  const rutaFrontend = path.join(app.getAppPath(), '..', 'frontend', 'index.html');
  
  console.log("Cargando archivo desde:", rutaFrontend);
  
  win.loadFile(rutaFrontend);
  
  // win.webContents.openDevTools(); // Descomenta si quieres ver la consola de la ventana
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