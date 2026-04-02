const { test, expect } = require('@playwright/test');

test('guest user is redirected to login when opening admin page', async ({ page }) => {
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});