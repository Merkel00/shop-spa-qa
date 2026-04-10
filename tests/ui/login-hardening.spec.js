const { test, expect } = require('@playwright/test');
const { gotoLogin } = require('./helpers/shop-ui');

test('empty login fields do not submit or authenticate', async ({ page }) => {
  let loginRequests = 0;

  await page.route('**/api/auth/login', async (route) => {
    loginRequests += 1;
    await route.continue();
  });

  await gotoLogin(page);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('shop_session')))
    .toBeNull();
  expect(loginRequests).toBe(0);
});

test('special-character login input is rejected safely without creating a session', async ({ page }) => {
  let loginRequests = 0;

  await page.route('**/api/auth/login', async (route) => {
    loginRequests += 1;
    await route.continue();
  });

  await gotoLogin(page);
  await page.locator('input[formcontrolname="email"]').fill('<script>@shop.com');
  await page.locator('input[formcontrolname="password"]').fill(`"' OR 1=1 --`);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('shop_session')))
    .toBeNull();
  expect(loginRequests).toBe(0);
});
