import { expect, test, type Page } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  const openSettings = async (page: Page) => {
    const settingsButton = page.locator('button').filter({ hasText: /settings/i });
    await settingsButton.click();
    await expect(page.getByText('Settings')).toBeVisible();
  };

  test('opens settings page when settings button is clicked', async ({ page }) => {
    await openSettings(page);

    await expect(page.getByText('OpenAI')).toBeVisible();
    await expect(page.getByText('Voice Input')).toBeVisible();
    await expect(page.getByText('About')).toBeVisible();
  });

  test('closes settings page when back button is clicked', async ({ page }) => {
    await openSettings(page);

    const backButton = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') });
    await backButton.click();

    await expect(page.getByText('Settings')).not.toBeVisible();
  });

  test('API key field is present and editable', async ({ page }) => {
    await openSettings(page);

    const apiKeyInput = page.locator('input#api-key');
    await expect(apiKeyInput).toBeVisible();

    await apiKeyInput.fill('sk-test-key-12345');
    await expect(apiKeyInput).toHaveValue('sk-test-key-12345');
  });

  test('API key field is masked by default', async ({ page }) => {
    await openSettings(page);

    const apiKeyInput = page.locator('input#api-key');
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  test('language selector is present', async ({ page }) => {
    await openSettings(page);

    const languageSelect = page.locator('select#language');
    await expect(languageSelect).toBeVisible();

    await languageSelect.selectOption('zh');
    await expect(languageSelect).toHaveValue('zh');
  });

  test('save button appears when settings are modified', async ({ page }) => {
    await openSettings(page);

    const saveButton = page.getByText('Save Changes');
    await expect(saveButton).not.toBeVisible();

    const apiKeyInput = page.locator('input#api-key');
    await apiKeyInput.fill('sk-new-key');

    await expect(saveButton).toBeVisible();
    await expect(saveButton).not.toBeDisabled();
  });
});
