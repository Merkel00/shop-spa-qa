const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:4200';
const TEST_EMAIL = 'admin@shop.local';
const TEST_PASSWORD = 'admin';

test('admin can sign in with valid credentials', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.locator('input[formcontrolname="email"]').fill(TEST_EMAIL);
  await page.locator('input[formcontrolname="password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();


  await expect(page).toHaveURL(/\/admin/);
});