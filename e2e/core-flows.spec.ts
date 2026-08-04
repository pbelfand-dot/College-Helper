import { expect, test } from '@playwright/test';
import { enterDemo } from './helpers';

/**
 * The flows a student actually performs, end to end, against a production
 * build in demo mode. Each test gets its own browser context, and therefore its
 * own isolated demo workspace.
 */

test('enters demo mode and sees a populated dashboard', async ({ page }) => {
  await enterDemo(page);

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hi ');
  await expect(page.getByText('Demo workspace.')).toBeVisible();

  // The dashboard's headline figures are real counts, not placeholders.
  await expect(page.getByText('Due in the next 7 days')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Coming up' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /Applications needing attention/i }),
  ).toBeVisible();

  // Checklist completion is labelled as such, never as readiness or a score.
  const body = await page.locator('main').innerText();
  expect(body).toContain('Checklist completion');
  expect(body.toLowerCase()).not.toContain('admission readiness');
  expect(body.toLowerCase()).not.toContain('chance of admission');
});

test('creates a college, an application, and completes a requirement', async ({ page }) => {
  await enterDemo(page);

  await page.goto('/colleges');
  await page.getByRole('button', { name: 'Add college' }).first().click();
  await page.getByLabel('College name').fill('End-to-End University');
  await page.getByLabel('City').fill('Testington');
  await page.getByRole('button', { name: 'Add to my list' }).click();

  await page.waitForURL(/\/colleges\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('End-to-End University');

  await page.getByRole('button', { name: 'Create an application' }).click();
  await page.getByLabel('Deadline', { exact: true }).fill('2027-01-15T23:59');
  await page.getByRole('button', { name: 'Create application' }).click();

  await page.waitForURL(/\/applications\/[0-9a-f-]+$/);

  // A new application starts with three suggested checklist items, none done.
  const progress = page.getByRole('progressbar').first();
  await expect(progress).toHaveAttribute('aria-label', '0 of 3 required items complete');

  await page.getByRole('button', { name: 'Add requirement' }).first().click();
  await page.getByLabel('What is required?').fill('Portfolio review');
  await page.getByRole('button', { name: 'Add requirement' }).last().click();
  await expect(progress).toHaveAttribute('aria-label', '0 of 4 required items complete');

  await page.getByRole('checkbox').first().check();
  await expect(progress).toHaveAttribute('aria-label', '1 of 4 required items complete');
  await expect(progress).toHaveAttribute('aria-valuenow', '25');
});

test('writes an essay draft, saves a version, and restores it without losing newer work', async ({
  page,
}) => {
  await enterDemo(page);

  await page.goto('/essays');
  await page.locator('a[href^="/essays/"]').first().click();
  await page.waitForURL(/\/essays\/[0-9a-f-]+$/);

  await page.getByRole('tab', { name: 'Draft' }).click();
  const draft = page.locator('#draft');

  await draft.fill('First version of the draft for the end-to-end test.');
  await expect(page.getByRole('status').first()).toContainText(/Saved at/, { timeout: 15_000 });
  await expect(page.locator('main')).toContainText('9 / 650 words');

  await page.getByRole('button', { name: 'Save a version' }).click();
  await expect(page.getByText('Version saved.', { exact: false })).toBeVisible();

  await draft.fill('Second version, which must survive restoring the first.');
  await expect(page.getByRole('status').first()).toContainText(/Saved at/, { timeout: 15_000 });

  await page.getByRole('tab', { name: 'Versions' }).click();
  const versionsBefore = await page.getByRole('tabpanel').locator('ul > li').count();
  expect(versionsBefore).toBeGreaterThan(1);

  await page.getByRole('button', { name: 'Restore' }).last().click();
  await page.getByRole('button', { name: 'Restore this version' }).click();
  await expect(page.getByText(/previous draft was saved/i)).toBeVisible();

  // Restoring is additive: the history grew rather than being truncated.
  await page.getByRole('tab', { name: 'Versions' }).click();
  const versionsAfter = await page.getByRole('tabpanel').locator('ul > li').count();
  expect(versionsAfter).toBeGreaterThanOrEqual(versionsBefore);
});

test('runs essay feedback through the offline coach without touching the draft', async ({
  page,
}) => {
  await enterDemo(page);

  await page.goto('/essays');
  await page.locator('a[href^="/essays/"]').first().click();
  await page.waitForURL(/\/essays\/[0-9a-f-]+$/);

  await page.getByRole('tab', { name: 'Draft' }).click();
  const draft = page.locator('#draft');
  await draft.fill('I really helped a lot with things at the creek. It was very good work.');
  await expect(page.getByRole('status').first()).toContainText(/Saved at/, { timeout: 15_000 });
  const before = await draft.inputValue();

  await page.getByRole('tab', { name: 'Coach' }).click();
  await page.getByRole('radio', { name: /Feedback/ }).click();
  await page.getByRole('button', { name: 'Give me feedback' }).click();

  await expect(page.getByText('Reading it through')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Offline coach')).toBeVisible();

  // Nothing the coach produced may alter the student's writing on its own.
  await page.getByRole('tab', { name: 'Draft' }).click();
  expect(await draft.inputValue()).toBe(before);
});

test('shows what will be sent before a coaching request', async ({ page }) => {
  await enterDemo(page);

  await page.goto('/coach');
  await page.getByRole('button', { name: 'Show what will be sent' }).click();
  await expect(page.getByText(/Only what you attach is sent/)).toBeVisible();
  await expect(page.getByText(/Do not put Social Security numbers/)).toBeVisible();
});

test('creates an activity and sees its character counter update live', async ({ page }) => {
  await enterDemo(page);

  await page.goto('/activities');
  await page.getByRole('button', { name: 'Add activity' }).first().click();

  await page.getByLabel('Organisation').fill('End-to-End Club');
  const description = page.getByLabel('Description');
  await description.fill('Twelve characters');
  await expect(page.getByText('17 / 150 characters')).toBeVisible();

  await description.fill('A rather longer description than the previous one');
  await expect(page.getByText('49 / 150 characters')).toBeVisible();

  await page.getByRole('button', { name: 'Add activity' }).last().click();
  await expect(page.getByRole('heading', { name: 'End-to-End Club' })).toBeVisible();
});

test('reorders activities', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/activities');

  const headings = page.locator('ol li h3');
  const firstBefore = await headings.first().innerText();
  const secondBefore = await headings.nth(1).innerText();

  await page.getByRole('button', { name: `Move ${firstBefore} down` }).click();

  await expect(headings.first()).toHaveText(secondBefore);
  await expect(headings.nth(1)).toHaveText(firstBefore);
});

test('adds a calendar task and marks it complete', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/calendar');

  await page.getByRole('button', { name: 'Add task', exact: true }).first().click();
  await page.getByLabel('What needs doing?').fill('End-to-end verification task');
  await page.getByRole('button', { name: 'Add task', exact: true }).last().click();

  const row = page.locator('li', { hasText: 'End-to-end verification task' }).first();
  await expect(row).toBeVisible();

  const checkbox = row.getByRole('checkbox');
  await checkbox.check();

  // The row stays visible, struck through, so the tick is confirmed.
  await expect(checkbox).toBeChecked();
  await expect(row.getByText('End-to-end verification task')).toHaveClass(/line-through/);
});

test('filters and searches saved records', async ({ page }) => {
  await enterDemo(page);

  await page.goto('/applications');
  const rowsBefore = await page.locator('tbody tr').count();
  expect(rowsBefore).toBeGreaterThan(1);

  await page.getByLabel('Search by college').fill('Grinnell');
  await expect(page.locator('tbody tr')).toHaveCount(1);

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(rowsBefore);

  await page.goto('/colleges');
  await page.getByLabel('Search your list').fill('zzzz-no-such-college');
  await expect(page.getByText('Nothing matches those filters')).toBeVisible();
});

test('exports every format', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/settings');

  for (const label of [
    'Complete backup (JSON)',
    'Application checklist (Markdown)',
    'Essays (Markdown)',
    'Activities (CSV)',
  ]) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: `Download ${label}` }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(
      /^applypilot-[a-z]+-\d{4}-\d{2}-\d{2}\.(json|md|csv)$/,
    );
  }
});

test('resets the demo workspace', async ({ page }) => {
  await enterDemo(page);

  await page.goto('/colleges');
  const before = await page.locator('a[href^="/colleges/"]').count();

  await page.locator('a[href^="/colleges/"]').first().click();
  await page.waitForURL(/\/colleges\/[0-9a-f-]+$/);
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete college' }).click();
  await page.waitForURL('**/colleges');
  await expect(page.locator('a[href^="/colleges/"]')).toHaveCount(before - 1);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Reset the demo' }).click();
  await expect(page.getByText('Demo workspace reset', { exact: false })).toBeVisible();

  await page.goto('/colleges');
  await expect(page.locator('a[href^="/colleges/"]')).toHaveCount(before);
});

test('shows a proper not-found state for a record that is not yours', async ({ page }) => {
  await enterDemo(page);

  await page.goto('/applications/11111111-1111-4111-8111-111111111111');
  await expect(page.getByText('We could not find that')).toBeVisible();

  await page.goto('/essays/11111111-1111-4111-8111-111111111111');
  await expect(page.getByText('We could not find that')).toBeVisible();
});

test('shows useful empty states in a fresh workspace', async ({ page }) => {
  await enterDemo(page, 'empty');

  // Onboarding first, since an empty workspace has no profile yet.
  await page.getByLabel('What should we call you?').fill('Sam');
  await page.getByRole('button', { name: 'Save and open my dashboard' }).click();
  await page.waitForURL('**/dashboard');

  await expect(page.getByText('Start with one college')).toBeVisible();

  await page.goto('/essays');
  await expect(page.getByText('No essays yet')).toBeVisible();

  await page.goto('/activities');
  await expect(page.getByText('No activities yet')).toBeVisible();
});

test('rejects invalid input with a visible message', async ({ page }) => {
  await enterDemo(page);

  await page.goto('/colleges');
  await page.getByRole('button', { name: 'Add college' }).first().click();
  await page.getByLabel('College name').fill('Bad Link University');
  await page.getByLabel('Main website').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Add to my list' }).click();

  await expect(page.getByText('Enter a full link starting with http')).toBeVisible();
});

test('opens exactly one dialog from an empty list', async ({ page }) => {
  /*
   * Regression test. The empty state used to render the same `<Dialog>` element
   * a second time, which mounts a second dialog sharing the same open state.
   * Both opened together, stacking two modals with duplicate field ids, and
   * each marked everything outside itself `aria-hidden` — so between them the
   * whole document, including the dialogs, vanished from the accessibility
   * tree. That is the first screen a new student sees, which is what made it
   * worth a test rather than a quiet fix.
   */
  await enterDemo(page, 'empty');

  await page.getByLabel('What should we call you?').fill('Sam');
  await page.getByRole('button', { name: 'Save and open my dashboard' }).click();
  await page.waitForURL('**/dashboard');

  for (const [path, trigger, submit] of [
    ['/colleges', 'Add your first college', 'Add to my list'],
    ['/activities', 'Add your first activity', 'Add activity'],
    ['/essays', 'Start your first essay', 'Create essay'],
  ] as const) {
    await page.goto(path);
    await page.getByRole('button', { name: trigger }).click();

    // One dialog, and it is reachable by role — which it is not when a stray
    // `aria-hidden` covers the document.
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(page.getByRole('button', { name: submit })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});
