// Preload — the ONLY bridge between main and renderer. Runs sandboxed (Electron
// default): no arbitrary require, no Node primitives leak. The exposed surface is
// exactly { platform, getAppVersion } — never ipcRenderer itself, never a generic
// send/invoke, never a caller-chosen channel.
const { contextBridge, ipcRenderer } = require('electron');

// Single allowlisted channel — MUST stay in lockstep with main.js APP_VERSION_CHANNEL.
const APP_VERSION_CHANNEL = 'app:get-version';
const APP_VERSION_TIMEOUT_MS = 3000;

// Fail-closed version query: any failure (IPC error, timeout, malformed reply)
// resolves to the literal 'unavailable' — never a fabricated version — and is
// observable on the console. Callers never crash on version failure.
function getAppVersion() {
  return Promise.race([
    ipcRenderer.invoke(APP_VERSION_CHANNEL),
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('APP_VERSION_TIMEOUT')), APP_VERSION_TIMEOUT_MS);
    }),
  ])
    .then((v) => {
      // Strict SemVer 2.0.0 (semver.org): no leading zeros, dot-separated non-empty
      // pre-release/build identifiers — '01.2.3', '1.2.3-..', '1.2.3+.' all fail.
      const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
      if (typeof v === 'string' && SEMVER.test(v)) return v;
      throw new Error('APP_VERSION_MALFORMED');
    })
    .catch((err) => {
      console.warn('[preload] app version unavailable:', err && err.message);
      return 'unavailable';
    });
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getAppVersion,
});
