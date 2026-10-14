import { expect, test } from '@playwright/test';

test('main menu can start a game', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible();
  await page.getByRole('button', { name: /play game/i }).click();
  await expect(page.getByRole('heading', { name: 'Survive the fleet' })).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});
