// tests/ui/protected-route.spec.js
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:4200';

test('unauthenticated user is redirected to login when opening protected profile page', async ({ page }) => {

  await page.goto(`${BASE_URL}/profile`);

  
  await expect(page).toHaveURL(/\/login/);


  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();


  await expect(page).toHaveURL(/returnUrl=%2Fprofile|returnUrl=\/profile/);
});