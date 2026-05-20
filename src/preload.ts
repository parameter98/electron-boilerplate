// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  quit: () => ipcRenderer.send("quit"),
  minimize: () => ipcRenderer.send("minimize"),
  maximize: () => ipcRenderer.send("maximize"),
});

// exe picker and validator

console.log("[preload] loaded");

contextBridge.exposeInMainWorld("desktopApi", {
  pickExecutable: async () => {
    const traceId = `pickExecutable-${Date.now()}`;
    console.log("[preload]", traceId, "invoke:start", "dialog:pickExecutable");

    try {
      const result = await ipcRenderer.invoke("dialog:pickExecutable");
      console.log("[preload]", traceId, "invoke:success", result);
      return result;
    } catch (error) {
      console.error("[preload]", traceId, "invoke:error", error);
      throw error;
    }
  },

  validateExecutable: async (filePath: string) => {
    const traceId = `validateExecutable-${Date.now()}`;
    console.log("[preload]", traceId, "invoke:start", {
      channel: "path:validateExecutable",
      filePath,
    });

    try {
      const result = await ipcRenderer.invoke("path:validateExecutable", filePath);
      console.log("[preload]", traceId, "invoke:success", result);
      return result;
    } catch (error) {
      console.error("[preload]", traceId, "invoke:error", error);
      throw error;
    }
  },

  debugPing: async () => {
    const traceId = `debugPing-${Date.now()}`;
    console.log("[preload]", traceId, "invoke:start", "debug:ping");

    try {
      const result = await ipcRenderer.invoke("debug:ping");
      console.log("[preload]", traceId, "invoke:success", result);
      return result;
    } catch (error) {
      console.error("[preload]", traceId, "invoke:error", error);
      throw error;
    }
  },
});