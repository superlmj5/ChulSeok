const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('test.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle file saving
ipcMain.handle('save-file', async (event, data) => {
  const today = new Date().toISOString().slice(0, 10);
  const { filePath } = await dialog.showSaveDialog({
    title: '데이터 저장',
    defaultPath: `attendance-data-${today}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (filePath) {
    try {
      fs.writeFileSync(filePath, data);
      return { success: true, path: filePath };
    } catch (err) {
      console.error('Failed to save file:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'No path selected' };
});

// Handle file loading
ipcMain.handle('load-file', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        title: '데이터 불러오기',
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePaths && filePaths.length > 0) {
        try {
            const data = fs.readFileSync(filePaths[0], 'utf-8');
            return { success: true, data: data };
        } catch (err) {
            console.error('Failed to read file:', err);
            return { success: false, error: err.message };
        }
    }
    return { success: false, error: 'No file selected' };
});

// Handle printing to PDF
ipcMain.handle('print-to-pdf', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { filePath } = await dialog.showSaveDialog({
        title: 'PDF로 저장',
        defaultPath: `출석부-${new Date().toISOString().slice(0, 10)}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (filePath) {
        try {
            const pdfData = await win.webContents.printToPDF({
                printBackground: true,
                pageSize: 'A4',
                landscape: true
            });
            fs.writeFileSync(filePath, pdfData);
            return { success: true, path: filePath };
        } catch (err) {
            console.error('Failed to print to PDF:', err);
            return { success: false, error: err.message };
        }
    }
    return { success: false, error: 'No path selected' };
});
