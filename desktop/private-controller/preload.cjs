/* eslint-disable @typescript-eslint/no-require-imports */
/* global require */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ocdController", {
  state: () => ipcRenderer.invoke("controller:state"),
  chooseRepository: () => ipcRenderer.invoke("controller:choose-repository"),
  play: () => ipcRenderer.invoke("controller:play"),
  update: () => ipcRenderer.invoke("controller:update"),
  finishUpdate: () => ipcRenderer.invoke("controller:finish-update"),
  cancel: () => ipcRenderer.invoke("controller:cancel"),
  onEvent: (listener) => {
    const wrapped = (_event, value) => listener(value);
    ipcRenderer.on("controller:event", wrapped);
    return () => ipcRenderer.removeListener("controller:event", wrapped);
  },
});
