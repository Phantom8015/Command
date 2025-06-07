const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  validateUrl: (url) => ipcRenderer.invoke("validate-url", url),
  convertAndBuildWebsite: (options) =>
    ipcRenderer.invoke("convert-and-build-website", options),
  showSaveDialog: () => ipcRenderer.invoke("show-save-dialog"),
  checkNodeStatus: () => ipcRenderer.invoke("check-node-status"),
  installNode: () => ipcRenderer.invoke("install-node"),
});
