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
    await expect(page.getByRole('heading', { name: 'ASR' })).toBeVisible();
  });

  test('OpenAI fields are present and editable', async ({ page }) => {
    await openSettings(page);

    const apiKeyInput = page.locator('input[name="llmApiKey"]');
    const baseUrlInput = page.locator('input[name="llmBaseUrl"]');
    const modelInput = page.locator('input[name="llmModel"]');

    await expect(apiKeyInput).toBeVisible();
    await expect(baseUrlInput).toBeVisible();
    await expect(modelInput).toBeVisible();

    await apiKeyInput.fill('sk-test-key-12345');
    await baseUrlInput.fill('https://api.openai.com');
    await modelInput.fill('gpt-4o-mini');

    await expect(apiKeyInput).toHaveValue('sk-test-key-12345');
    await expect(baseUrlInput).toHaveValue('https://api.openai.com');
    await expect(modelInput).toHaveValue('gpt-4o-mini');
  });

  test('ASR fields are present and editable', async ({ page }) => {
    await openSettings(page);

    const asrModelInput = page.locator('input[name="asrModel"]');
    const asrLanguageInput = page.locator('input[name="asrLanguage"]');

    await expect(asrModelInput).toBeVisible();
    await expect(asrLanguageInput).toBeVisible();

    await asrModelInput.fill('whisper-1');
    await asrLanguageInput.fill('zh');

    await expect(asrModelInput).toHaveValue('whisper-1');
    await expect(asrLanguageInput).toHaveValue('zh');
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

  test('save button appears when AI fields are modified', async ({ page }) => {
    await openSettings(page);

    const modelInput = page.locator('input[name="llmModel"]');
    const saveButton = page.getByText('Save AI Settings');

    await expect(saveButton).not.toBeVisible();

    await modelInput.fill('gpt-4o');

    await expect(saveButton).toBeVisible();
    await expect(saveButton).not.toBeDisabled();
  });
});
