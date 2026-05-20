import { app, BrowserWindow, ipcMain, dialog } from "electron";
import fs from "node:fs/promises" // file system
import path from "path";
import { shell } from "electron";
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
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

// Handle executable path picking
ipcMain.handle("dialog:pickExecutable", async () => {
  const traceId = `pick-exe-${Date.now()}`;
  console.log("[main]", traceId, "open dialog");

  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Executable", extensions: ["exe"] }],
  });

  console.log("[main]", traceId, "dialog result", {
    canceled: result.canceled,
    filePaths: result.filePaths,
  });

  if (result.canceled || result.filePaths.length === 0) {
    console.log("[main]", traceId, "return null");
    return null;
  }

  console.log("[main]", traceId, "return path", result.filePaths[0]);
  return result.filePaths[0];
});

ipcMain.handle("path:validateExecutable", async (_event, filePath: string) => {
  try {
    const normalized = path.normalize(filePath);
    const stat = await fs.stat(normalized);
    const exists = stat.isFile();
    const extOk = path.extname(normalized).toLowerCase() === ".exe";

    const base = path.basename(normalized).toLowerCase();
    const looksLikeTarget =
      base.includes("lm studio") || base.includes("anythingllm") || base.includes("chromesetup");

    return {
      ok: exists && extOk,
      exists,
      extOk,
      looksLikeTarget,
    };
  } catch (error: any) {
    return {
      ok: false,
      exists: false,
      extOk: false,
      error: error?.message ?? "Unknown error",
    };
  }
});