/* eslint-disable @typescript-eslint/no-require-imports */
/* global require */
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ocdArtBench", {
  prepare: (subject) => ipcRenderer.invoke("artbench:prepare", subject),
  startDrag: (subject) => ipcRenderer.send("artbench:drag", subject),
  revealDownload: () => ipcRenderer.invoke("artbench:reveal-download"),
  viewState: () => ipcRenderer.invoke("artbench:view-state"),
  selectedBuild: () => ipcRenderer.invoke("artbench:selected-build"),
  rememberView: (value) => ipcRenderer.send("artbench:remember-view", value),
});
