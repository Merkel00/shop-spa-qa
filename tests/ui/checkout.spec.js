const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/shop-ui');

test('logged-in user can open checkout page', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/cart/checkout');

  await expect(page).toHaveURL(/\/cart\/checkout/);
});
