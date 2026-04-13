'use strict';

/**
 * electron/main.js — Aethoria desktop entry point
 *
 * Dev mode  (npm run electron:dev):
 *   Loads http://localhost:8001 (Vite dev server).
 *   Absolute paths like /assets/tileset.png resolve against the dev server root.
 *
 * Production (inside packaged app after `npm run dist:*`):
 *   Spins up a tiny built-in HTTP server that serves dist/ on a random local
 *   port, then loads that URL. This is intentional: serving via HTTP (not
 *   file://) means absolute paths in the game code resolve correctly and the
 *   service worker can register.
 */

const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron');
const path   = require('path');
const http   = require('http');
const fs     = require('fs');
const url    = require('url');

const IS_DEV = !app.isPackaged || process.env.NODE_ENV === 'development';
const DEV_URL = 'http://localhost:8001';

// ── Determine the dist/ directory ────────────────────────────────────────────

function getDistDir() {
  if (IS_DEV) return null; // not used in dev
  // When packaged, __dirname is inside the asar bundle under resources/.
  // electron-builder copies dist/ as an extraResource — find it relative to
  // process.resourcesPath. In an unpackaged production test (npm run build &&
  // npm run electron) it sits two levels up from electron/.
  const candidates = [
    path.join(process.resourcesPath ?? '', 'dist'),     // packaged
    path.join(__dirname, '..', 'dist'),                  // unpackaged test
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'index.html'))) return c;
  }
  throw new Error('[Aethoria] Cannot locate dist/index.html. Run `npm run build` first.');
}

// ── Minimal local HTTP server for production ──────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.mp3':  'audio/mpeg',
  '.ogg':  'audio/ogg',
  '.wav':  'audio/wav',
};

function startFileServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let pathname = url.parse(req.url).pathname;
      // Remove query/hash; treat directory URLs as index.html
      if (pathname === '/' || pathname === '') pathname = '/index.html';
      const filePath = path.join(distDir, pathname);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // SPA fallback: serve index.html for any 404 so client-side routing works
          const fallback = path.join(distDir, 'index.html');
          fs.readFile(fallback, (err2, d2) => {
            if (err2) { res.writeHead(404); res.end('Not found'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(d2);
          });
          return;
        }
        const ext  = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
    server.on('error', reject);
  });
}

// ── BrowserWindow factory ─────────────────────────────────────────────────────

let mainWindow = null;
let localServer = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 720,
    minWidth:  800,
    minHeight: 500,
    fullscreenable: true,
    // No title bar menu in game
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0f',
    title: 'Aethoria',
    icon: path.join(__dirname, '..', 'build-resources', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow service workers and IndexedDB (needed for save system)
      allowRunningInsecureContent: false,
    },
  });

  // Remove the default application menu (shows File/Edit/… which looks wrong in a game)
  Menu.setApplicationMenu(null);

  if (IS_DEV) {
    await mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const distDir = getDistDir();
    const { server, port } = await startFileServer(distDir);
    localServer = server;
    await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
  }

  // Open external links in the system browser, not in the game window
  mainWindow.webContents.setWindowOpenHandler(({ url: href }) => {
    if (href.startsWith('http')) shell.openExternal(href);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('platform', () => process.platform);
ipcMain.handle('app-version', () => app.getVersion());

// Toggle fullscreen via IPC (game can send 'toggle-fullscreen')
ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (localServer) localServer.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
