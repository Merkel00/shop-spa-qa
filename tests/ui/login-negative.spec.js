const { test, expect } = require('@playwright/test');

test('user cannot sign in with invalid password', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

  await page.locator('input[formcontrolname="email"]').fill('admin@shop.com');
  await page.locator('input[formcontrolname="password"]').fill('wrongpassword');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect(page).not.toHaveURL(/\/admin/);
});