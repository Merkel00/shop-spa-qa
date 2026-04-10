const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/shop-ui');

test('user can sign in with valid credentials', async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page).toHaveURL(/\/profile|\/admin/);
});
