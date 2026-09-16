/* eslint-disable @typescript-eslint/no-require-imports */
/* global require */

// Narrow bridge for the hub's own local pages only. The game and Art Desk
// views have no preload and therefore no IPC surface.
const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel) => (arg) => ipcRenderer.invoke(channel, arg);

contextBridge.exposeInMainWorld("ocdHub", {
  state: invoke("hub:state"),
  tab: invoke("hub:tab"),
  branches: invoke("hub:branches"),
  selectTrack: invoke("hub:select-track"),
  check: invoke("hub:check"),
  apply: invoke("hub:apply"),
  rollback: invoke("hub:rollback"),
  returnMain: invoke("hub:return-main"),
  cancelBuild: invoke("hub:cancel-build"),
  chooseRepository: invoke("hub:choose-repository"),
  choosePack: invoke("hub:choose-pack"),
  setArtDeskBranch: invoke("hub:artdesk-branch"),
  startArtDesk: invoke("hub:artdesk-start"),
  restartArtDesk: invoke("hub:artdesk-restart"),
  artDeskInputs: invoke("hub:artdesk-inputs"),
  revealToken: invoke("hub:reveal-token"),
  agents: {
    snapshot: invoke("agents:snapshot"),
    detect: invoke("agents:detect"),
    startCodex: invoke("agents:start-codex"),
    enroll: invoke("agents:enroll"),
    connect: invoke("agents:connect"),
    send: invoke("agents:send"),
    cancel: invoke("agents:cancel"),
    stopAll: invoke("agents:stop-all"),
  },
  onState: (listener) => {
    const wrapped = (_event, value) => listener(value);
    ipcRenderer.on("hub:state", wrapped);
    return () => ipcRenderer.removeListener("hub:state", wrapped);
  },
});
