'use strict';

/**
 * electron/preload.js
 * Runs in the renderer process (the game window) before any web content.
 * contextBridge is the only safe way to expose Node/Electron APIs to the game.
 *
 * Keep this minimal — every exposure is a potential attack surface.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** True when running inside Electron (lets game code detect the platform). */
  isElectron: true,

  /** 'win32' | 'darwin' | 'linux' */
  getPlatform: () => ipcRenderer.invoke('platform'),

  /** Semantic version string from package.json */
  getVersion: () => ipcRenderer.invoke('app-version'),

  /** Toggle native fullscreen */
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
});
