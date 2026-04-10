const { expect } = require('@playwright/test');

const TEST_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@shop.local';
const TEST_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin';

async function gotoLogin(page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
}

async function loginAsAdmin(page) {
  await gotoLogin(page);
  await page.locator('input[formcontrolname="email"]').fill(TEST_EMAIL);
  await page.locator('input[formcontrolname="password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/profile|\/admin/);
}

async function addFirstCatalogItemToCart(page) {
  await page.goto('/');

  const addToCartButton = page.getByRole('button', { name: /^add to cart$/i }).first();
  await expect(addToCartButton).toBeVisible();
  await addToCartButton.click();

  await expect(page.getByRole('status').filter({ hasText: /added to cart/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /cart/i })).toContainText(/\d+/);
}

async function openCheckoutWithItem(page) {
  await addFirstCatalogItemToCart(page);
  await page.getByRole('link', { name: /cart/i }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole('link', { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/cart\/checkout/);
  await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible();
}

async function fillCheckoutForm(page, overrides = {}) {
  const values = {
    name: 'QA User',
    email: 'qa.user@example.com',
    address: '123 Test Street',
    ...overrides,
  };

  await page.locator('input[formcontrolname="name"]').fill(values.name);
  await page.locator('input[formcontrolname="email"]').fill(values.email);
  await page.locator('input[formcontrolname="address"]').fill(values.address);
}

module.exports = {
  TEST_EMAIL,
  TEST_PASSWORD,
  gotoLogin,
  loginAsAdmin,
  openCheckoutWithItem,
  fillCheckoutForm,
};
