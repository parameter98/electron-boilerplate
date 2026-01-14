// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  quit: () => ipcRenderer.send("quit"),
  minimize: () => ipcRenderer.send("minimize"),
  maximize: () => ipcRenderer.send("maximize"),
  // 파일 저장 요청 (ArrayBuffer 전달)
  saveFile: (fileName: string, fileData: ArrayBuffer) =>
    ipcRenderer.invoke('save-file', { fileName, fileData }),

  // 파일 열기 요청
  openPath: (path: string) => ipcRenderer.invoke('open-path', path),
  // [추가] 파일 삭제 요청
  deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path)
});
