'use strict';

/**
 * The ApplyPilot desktop shell.
 *
 * ApplyPilot is a Next.js server application, so the desktop build does not
 * reimplement it — it starts the same standalone server on a private port,
 * bound to the loopback interface, and opens a window onto it. Everything the
 * web version does works here for the same reason it works there.
 *
 * Two things are different, and both are set here rather than in the app:
 * storage is a JSON file in the operating system's per-user application data
 * directory, and there is no sign-in, because the OS account is already the
 * boundary around that file.
 */

const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { existsSync } = require('node:fs');
const path = require('node:path');

const HOST = '127.0.0.1';
/** The server is local and starts cold; be patient before giving up on it. */
const SERVER_START_TIMEOUT_MS = 60_000;

/** Where the packaged app's files live, in both a build and a dev run. */
const rootDir = app.isPackaged
  ? path.join(process.resourcesPath, 'app')
  : path.join(__dirname, '..');
const serverEntry = path.join(rootDir, '.next', 'standalone', 'server.js');

let serverProcess = null;
let mainWindow = null;
let serverOrigin = null;

/**
 * Only one copy may run: two of them would open two servers over one data file
 * and quietly overwrite each other's saves.
 */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(start).catch(reportFatal);
}

async function start() {
  Menu.setApplicationMenu(buildMenu());

  if (!existsSync(serverEntry)) {
    reportFatal(
      new Error(
        `This build is missing its server files (looked in ${serverEntry}). ` +
          'Run `npm run desktop:prepare` before packaging.',
      ),
    );
    return;
  }

  const port = await findFreePort();
  serverOrigin = `http://${HOST}:${port}`;

  startServer(port);
  createWindow();

  try {
    await waitForServer(serverOrigin);
    await mainWindow.loadURL(`${serverOrigin}/dashboard`);
  } catch (error) {
    reportFatal(error);
  }
}

// --- The server ------------------------------------------------------------

function startServer(port) {
  const dataFile = path.join(app.getPath('userData'), 'applypilot-data.json');

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: path.join(rootDir, '.next', 'standalone'),
    env: {
      ...process.env,
      /*
       * Runs the Next server on Electron's own bundled Node rather than
       * shipping a second copy of Node in the installer.
       */
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      HOSTNAME: HOST,
      PORT: String(port),
      APPLYPILOT_STORAGE: 'file',
      APPLYPILOT_DATA_FILE: dataFile,
      NEXT_PUBLIC_APP_URL: `http://${HOST}:${port}`,
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  /*
   * Server output goes to this process's console and nowhere else. It is
   * request lines and stack traces — never essay text or profile details —
   * and it is not written to a file, because a log file next to a student's
   * data is one more thing that can leak.
   */
  serverProcess.stdout.on('data', (chunk) => process.stdout.write(chunk));
  serverProcess.stderr.on('data', (chunk) => process.stderr.write(chunk));

  serverProcess.on('exit', (code) => {
    serverProcess = null;
    // A server that dies while the window is open leaves an app that looks
    // fine and does nothing. Say so instead.
    if (!app.isQuitting && code !== 0) {
      reportFatal(new Error(`The ApplyPilot server stopped unexpectedly (exit code ${code}).`));
    }
  });
}

/**
 * Asks the operating system for a port nobody is using.
 *
 * A fixed port would collide with whatever else the student happens to be
 * running, and would let any other program on the machine guess where their
 * records are being served.
 */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, HOST, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer(origin) {
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (!serverProcess) throw new Error('The ApplyPilot server did not start.');
    try {
      const response = await fetch(`${origin}/dashboard`, { redirect: 'manual' });
      if (response.status > 0) return;
    } catch {
      // Not listening yet. Next.js is still booting.
    }
    await delay(120);
  }

  throw new Error('The ApplyPilot server did not start in time.');
}

// --- The window ------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 560,
    show: false,
    backgroundColor: '#f7f8fa',
    title: 'ApplyPilot',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      /*
       * The renderer is a browser tab and nothing more. It gets no Node, no
       * remote module and no shared context with this process — so a bug in a
       * page cannot become access to the student's file system.
       */
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  guardNavigation(mainWindow.webContents);
}

/**
 * Keeps the window pointed at the local server.
 *
 * A college's website, a scholarship page or a Common App link belongs in the
 * student's real browser, where their bookmarks, extensions and password
 * manager are — not inside an app window with no address bar, which is exactly
 * the shape a phishing page wants to borrow.
 */
function guardNavigation(contents) {
  contents.on('will-navigate', (event, url) => {
    if (!isLocal(url)) {
      event.preventDefault();
      openExternally(url);
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    openExternally(url);
    return { action: 'deny' };
  });

  // No page in this app embeds anything, so nothing needs these.
  contents.session.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );
}

function isLocal(url) {
  try {
    return serverOrigin !== null && new URL(url).origin === serverOrigin;
  } catch {
    return false;
  }
}

function openExternally(url) {
  // Only ever hand a real web address to the operating system. `file:` and
  // custom schemes can launch programs.
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      void shell.openExternal(url);
    }
  } catch {
    // Not a URL. Nothing to open.
  }
}

function buildMenu() {
  const isMac = process.platform === 'darwin';

  return Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open the data folder',
          click: () => void shell.openPath(app.getPath('userData')),
        },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ApplyPilot',
          click: () =>
            void dialog.showMessageBox({
              type: 'info',
              title: 'About ApplyPilot',
              message: `ApplyPilot ${app.getVersion()}`,
              detail: [
                'An independent college application planner. Not affiliated with',
                'the Common Application or with any college, and it cannot submit',
                'anything on your behalf.',
                '',
                'Everything you enter is stored on this computer, in:',
                app.getPath('userData'),
              ].join('\n'),
            }),
        },
      ],
    },
  ]);
}

// --- Shutting down ---------------------------------------------------------

app.on('window-all-closed', () => app.quit());

app.on('before-quit', () => {
  app.isQuitting = true;
  stopServer();
});

app.on('quit', stopServer);

/**
 * Stops the server politely.
 *
 * SIGTERM rather than SIGKILL, because the file store writes on a short
 * debounce and flushes when it is asked to shut down. Killing outright could
 * throw away the last thing the student typed.
 */
function stopServer() {
  const child = serverProcess;
  if (!child) return;
  serverProcess = null;

  try {
    child.kill('SIGTERM');
  } catch {
    // Already gone.
  }
}

function reportFatal(error) {
  const message = error instanceof Error ? error.message : String(error);
  dialog.showErrorBox('ApplyPilot could not start', message);
  app.isQuitting = true;
  stopServer();
  app.exit(1);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
