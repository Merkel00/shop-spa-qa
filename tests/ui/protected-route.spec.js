const { test, expect } = require('@playwright/test');

test('unauthenticated user is redirected to login when opening protected profile page', async ({ page }) => {
  await page.goto('/profile');

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect(page).toHaveURL(/returnUrl=%2Fprofile|returnUrl=\/profile/);
});