import { expect, test } from '@playwright/test';
import { enterDemo } from './helpers';

/**
 * Mobile viewport checks. Runs under the `mobile` Playwright project, which
 * uses a Pixel 7 viewport.
 */

test('navigates the whole product on a phone', async ({ page }) => {
  await enterDemo(page);

  // The desktop sidebar must not be taking up space here.
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();

  // The bottom bar carries the primary destinations.
  const primary = page.getByRole('navigation', { name: 'Primary' });
  await expect(primary).toBeVisible();
  await primary.getByRole('link', { name: 'Colleges' }).click();
  await page.waitForURL('**/colleges');

  // Everything else is behind the menu.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'Scholarships' }).click();
  await page.waitForURL('**/scholarships');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Scholarships');

  // The menu closes itself once navigation happens.
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('edits an essay draft on a phone', async ({ page }) => {
  await enterDemo(page);

  await page.goto('/essays');
  await page.locator('a[href^="/essays/"]').first().click();
  await page.waitForURL(/\/essays\/[0-9a-f-]+$/);

  await page.getByRole('tab', { name: 'Draft' }).click();
  const draft = page.locator('#draft');
  await draft.fill('Written on a phone-sized viewport.');

  await expect(page.getByRole('status').first()).toContainText(/Saved at/, { timeout: 15_000 });
  await expect(page.locator('main')).toContainText('5 / 650 words');

  // Reloading proves it persisted rather than only living in component state.
  await page.reload();
  await page.getByRole('tab', { name: 'Draft' }).click();
  await expect(page.locator('#draft')).toHaveValue('Written on a phone-sized viewport.');
});

test('does not scroll sideways on any main page', async ({ page }) => {
  await enterDemo(page);

  for (const route of ['/dashboard', '/colleges', '/essays', '/activities', '/settings']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${route} scrolls horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
  }
});
