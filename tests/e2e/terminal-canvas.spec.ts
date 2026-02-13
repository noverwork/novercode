import { expect, test } from '@playwright/test';

test.describe('Terminal Frontend', () => {
  test('app loads and basic UI is present', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Tauri \+ React \+ Typescript/);
    await expect(page.locator('#root')).toBeVisible();
    const viewportSize = page.viewportSize();
    expect(viewportSize).toBeTruthy();
    expect(viewportSize?.width).toBeGreaterThan(800);
    expect(viewportSize?.height).toBeGreaterThan(600);
  });

  test('root container persists across navigation refresh', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    await page.reload();
    await expect(page.locator('#root')).toBeVisible();
  });

  test('responsive design - viewport resizing', async ({ page }) => {
    await page.goto('/');
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
      { width: 800, height: 600 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#root')).toBeVisible();
    }
  });
});
