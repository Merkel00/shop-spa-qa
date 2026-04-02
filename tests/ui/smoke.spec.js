const { test, expect } = require('@playwright/test');

test('application home page opens successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/localhost:4200/);
  await expect(page.locator('body')).toBeVisible();
});