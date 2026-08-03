import { expect, type Page } from '@playwright/test';

/** Signs into a fresh seeded demo workspace and lands on the dashboard. */
export async function enterDemo(page: Page, variant: 'seeded' | 'empty' = 'seeded'): Promise<void> {
  await page.goto('/login');
  const label =
    variant === 'seeded' ? 'Enter the demo with sample data' : 'Start with an empty workspace';
  await page.getByRole('button', { name: label }).click();
  await page.waitForURL(variant === 'seeded' ? '**/dashboard' : '**/onboarding');
}

/** Fails the test if the browser logged an error or a request 4xx/5xx'd. */
export function trackPageProblems(page: Page): { problems: string[] } {
  const problems: string[] = [];

  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`HTTP ${response.status()} ${response.url()}`);
    }
  });

  return { problems };
}

export async function expectNoProblems(problems: string[]): Promise<void> {
  expect(problems, `Unexpected browser problems:\n${problems.join('\n')}`).toEqual([]);
}
