import { expect, test, type Page } from '@playwright/test';

test.describe('Settings Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  const openSettings = async (page: Page) => {
    const settingsButton = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-settings') });
    await settingsButton.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  };

  test('settings sheet opens and shows all sections', async ({ page }) => {
    await openSettings(page);

    await expect(page.getByText('Settings')).toBeVisible();
    await expect(page.getByText('Version')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'OpenAI' })).toBeVisible();
  });

  test('API key field is present and editable', async ({ page }) => {
    await openSettings(page);

    const apiKeyInput = page.locator('input[name="llmApiKey"]');

    await expect(apiKeyInput).toBeVisible();

    await apiKeyInput.fill('sk-test-key-12345');

    await expect(apiKeyInput).toHaveValue('sk-test-key-12345');
  });

  test('API key field is masked by default', async ({ page }) => {
    await openSettings(page);

    const apiKeyInput = page.locator('input[name="llmApiKey"]');
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  test('API key visibility toggle works', async ({ page }) => {
    await openSettings(page);

    const apiKeyInput = page.locator('input[name="llmApiKey"]');
    const toggleButton = page.locator('[data-testid="toggle-llm-api-key-visibility"]');

    await expect(apiKeyInput).toHaveAttribute('type', 'password');

    await toggleButton.click();
    await expect(apiKeyInput).toHaveAttribute('type', 'text');

    await toggleButton.click();
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  test('save button appears when API key is modified', async ({ page }) => {
    await openSettings(page);

    const apiKeyInput = page.locator('input[name="llmApiKey"]');
    const saveButton = page.getByText('Save');

    await expect(saveButton).not.toBeVisible();

    await apiKeyInput.fill('sk-new-key');

    await expect(saveButton).toBeVisible();
    await expect(saveButton).not.toBeDisabled();
  });
});
