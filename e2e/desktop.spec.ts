import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The packaged desktop app, driven as a real application.
 *
 * These tests run against the package for the current operating system. The
 * Windows Actions build therefore launches the exact PE it is about to upload.
 *
 * The test that matters is the third one. Everything else in ApplyPilot already
 * had coverage before the desktop build existed; "quit the app and your college
 * list is still there" is the one behaviour the desktop build was added for.
 */

const APP_BINARY =
  process.platform === 'win32'
    ? join(process.cwd(), 'dist-desktop', 'win-unpacked', 'ApplyPilot.exe')
    : join(process.cwd(), 'dist-desktop', 'linux-unpacked', 'applypilot');

/** One data directory for the whole file, so tests 2 and 3 share a workspace. */
let userDataDir: string | null = null;

test.beforeAll(() => {
  if (!existsSync(APP_BINARY)) {
    throw new Error(`No packaged app at ${APP_BINARY}. Run \`npm run desktop:build\` first.`);
  }
  userDataDir = mkdtempSync(join(tmpdir(), 'applypilot-desktop-'));
});

test.afterAll(() => {
  if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
});

async function launch(): Promise<{ app: ElectronApplication; window: Page }> {
  const app = await electron.launch({
    executablePath: APP_BINARY,
    args: [
      `--user-data-dir=${userDataDir}`,
      // Chromium's setuid sandbox cannot start as root in a container. This is
      // a property of the test environment, not of the shipped app.
      '--no-sandbox',
    ],
    timeout: 120_000,
  });

  const window = await app.firstWindow({ timeout: 120_000 });
  // The window is created before the server answers, so wait for the app rather
  // than for the blank page it starts on.
  await window.waitForURL(/127\.0\.0\.1/, { timeout: 120_000 });
  await window.waitForLoadState('domcontentloaded');
  return { app, window };
}

function dataFile(): string {
  if (!userDataDir) throw new Error('Desktop test data directory was not initialized.');
  return join(userDataDir, 'applypilot-data.json');
}

test('opens a window and reaches onboarding on first run', async () => {
  const { app, window } = await launch();

  try {
    // No sign-in screen: the desktop build has no account to sign into.
    await expect(window).toHaveURL(/\/onboarding/, { timeout: 60_000 });
    await expect(window.getByLabel('What should we call you?')).toBeVisible();
    await expect(window.getByRole('button', { name: /sign in|sign out/i })).toHaveCount(0);

    // There is no browser chrome here, so the window title is the only place
    // the app names itself.
    expect(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle()),
    ).toContain('ApplyPilot');
  } finally {
    await app.close();
  }
});

test('saves a college that the student adds', async () => {
  const { app, window } = await launch();

  try {
    await window.getByLabel('What should we call you?').fill('Riley Okonkwo');
    await window.getByLabel('Graduation year').fill('2027');
    await window
      .getByRole('button', { name: /start planning|save|continue/i })
      .last()
      .click();
    await window.waitForURL(/\/dashboard/, { timeout: 60_000 });

    await window.goto(new URL('/colleges', window.url()).href);
    await window.getByRole('button', { name: 'Add college' }).first().click();
    await window.getByLabel('College name').fill('Riverbend State University');
    await window.getByRole('button', { name: 'Add to my list' }).click();
    await expect(window.getByRole('heading', { name: 'Riverbend State University' })).toBeVisible();
  } finally {
    await app.close();
  }
});

test('still has the college after the app is quit and reopened', async () => {
  // The previous test closed the app, which is what forces the file store to
  // flush. Nothing is in memory any more — this can only come off disk.
  const saved = JSON.parse(readFileSync(dataFile(), 'utf8')) as {
    colleges: { name: string }[];
    profile: { displayName: string } | null;
  };
  expect(saved.colleges.map((college) => college.name)).toContain('Riverbend State University');
  expect(saved.profile?.displayName).toBe('Riley Okonkwo');

  const { app, window } = await launch();

  try {
    // Straight to the dashboard: onboarding is already done, from a previous run
    // of a previous process.
    await expect(window).toHaveURL(/\/dashboard/, { timeout: 60_000 });
    await window.goto(new URL('/colleges', window.url()).href);
    await expect(window.getByText('Riverbend State University')).toBeVisible();
  } finally {
    await app.close();
  }
});

test('sends an external link to the real browser instead of navigating the app', async () => {
  const { app, window } = await launch();

  try {
    const origin = new URL(window.url()).origin;

    /*
     * Record what the shell is asked to open instead of actually opening it.
     * Blocking the navigation is only half the requirement — the link still has
     * to reach the student's real browser, and a guard that silently swallowed
     * it would pass a test that only checked the app's own URL.
     */
    await app.evaluate(({ shell }) => {
      const scope = globalThis as typeof globalThis & { externalOpens?: string[] };
      scope.externalOpens = [];
      shell.openExternal = async (target: string) => {
        scope.externalOpens?.push(target);
      };
    });

    // A college's own website is the obvious case: a student clicks it from a
    // college page, and it must not open inside a window with no address bar.
    await window.evaluate(() => {
      const link = document.createElement('a');
      link.id = 'external-probe';
      link.href = 'https://example.edu/admissions';
      link.textContent = 'Example College admissions';
      document.body.append(link);
    });
    // Dispatched rather than clicked: `page.click` waits for the navigation to
    // settle, and the whole point is that this navigation never happens.
    await window.locator('#external-probe').dispatchEvent('click');
    await window.waitForTimeout(1500);

    expect(new URL(window.url()).origin).toBe(origin);
    expect(app.windows()).toHaveLength(1);

    const opened = await app.evaluate(
      () => (globalThis as typeof globalThis & { externalOpens?: string[] }).externalOpens ?? [],
    );
    expect(opened).toEqual(['https://example.edu/admissions']);
  } finally {
    await app.close();
  }
});
