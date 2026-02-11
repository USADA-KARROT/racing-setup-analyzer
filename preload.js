// Preload script - minimal since all computation runs in renderer
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: require('./package.json').version,
});
