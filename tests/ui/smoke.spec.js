const { test, expect } = require('@playwright/test');

test('application page opens', async ({ page }) => {
  await page.goto('http://localhost:4200');
  await expect(page.locator('body')).toBeVisible();
});
