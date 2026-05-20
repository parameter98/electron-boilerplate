import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { shell } from "electron";
import started from "electron-squirrel-startup";
import fs from "fs";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 앱의 데이터 저장소 경로 (Windows: %APPDATA%/YourAppName/pdf-files/)
const BASE_STORAGE_PATH = path.join(app.getPath('userData'), 'pdf-files');

// 저장소 폴더가 없으면 생성
if (!fs.existsSync(BASE_STORAGE_PATH)) {
  fs.mkdirSync(BASE_STORAGE_PATH, { recursive: true });
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minHeight: 600,
    minWidth: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url); // Open URL in user's browser.
    return { action: "deny" }; // Prevent the app from opening the URL.
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools({
    mode: "detach",
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.on("quit", () => {
  app.quit();
});

ipcMain.on("minimize", () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.on("maximize", () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow?.isMaximized()) {
    focusedWindow.unmaximize();
  } else {
    focusedWindow?.maximize();
  }
});


// 1. 파일 저장 핸들러 (Buffer 데이터를 받아서 저장)
ipcMain.handle('save-file', async (event, { fileName, fileData }) => {
  try {
    // 안전한 절대 경로 생성
    const safeFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(BASE_STORAGE_PATH, safeFileName);

    // 파일 쓰기
    fs.writeFileSync(filePath, Buffer.from(fileData));

    // 저장된 절대 경로 반환
    return { success: true, path: filePath };
  } catch (error) {
    console.error('File save error:', error);
    return { success: false, error: error.message };
  }
});


// 2. 파일 열기 핸들러 (절대 경로를 받아서 실행)
ipcMain.handle('open-path', async (event, filePath) => {
  console.log('Opening file at:', filePath); // 디버깅용 로그
  const errorMessage = await shell.openPath(filePath);
  return errorMessage; // 성공 시 "", 실패 시 에러 메시지
});

// [추가] 파일 삭제 핸들러
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    // 파일이 실제로 존재하는지 확인
    if (fs.existsSync(filePath)) {
      // 파일 삭제 (unlink)
      await fs.promises.unlink(filePath);
      console.log('File deleted:', filePath);
    } else {
      console.log('File not found, skipping delete:', filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('File delete error:', error);
    // 파일 삭제 실패는 치명적이지 않다고 판단할 수도 있지만, 에러를 반환합니다.
    return { success: false, error: error.message };
  }
});