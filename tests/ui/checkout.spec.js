const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:4200';
const TEST_EMAIL = 'admin@shop.local';
const TEST_PASSWORD = 'admin';

test('logged-in user can open checkout page', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);

  await page.locator('input[formcontrolname="email"]').fill(TEST_EMAIL);
  await page.locator('input[formcontrolname="password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/admin/);


  await page.goto(`${BASE_URL}/cart/checkout`);

  await expect(page).toHaveURL(/\/cart\/checkout/);
});