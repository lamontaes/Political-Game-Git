/* eslint-disable @typescript-eslint/no-require-imports */
/* global require */
const { contextBridge, ipcRenderer } = require("electron");
// No filesystem, shell, updater or Art Bench authority crosses into a game.
contextBridge.exposeInMainWorld("ocdDesktop", {
  requestQuit: () => ipcRenderer.invoke("game:request-quit"),
  titleReady: () => ipcRenderer.send("game:title-ready"),
});
