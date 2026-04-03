const { test, expect } = require('@playwright/test');

const TEST_EMAIL = 'admin@shop.local';
const TEST_PASSWORD = 'admin';

test('logged-in user can open checkout page', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[formcontrolname="email"]').fill(TEST_EMAIL);
  await page.locator('input[formcontrolname="password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/profile|\/admin/);

  await page.goto('/cart/checkout');

  await expect(page).toHaveURL(/\/cart\/checkout/);
});