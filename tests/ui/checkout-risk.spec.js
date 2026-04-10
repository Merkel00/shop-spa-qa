const { test, expect } = require('@playwright/test');
const { loginAsAdmin, openCheckoutWithItem, fillCheckoutForm } = require('./helpers/shop-ui');

test('guest user is redirected to login when opening checkout directly', async ({ page }) => {
  await page.goto('/cart/checkout');

  await expect(page).toHaveURL(/\/login/);
  await expect(page).toHaveURL(/returnUrl=%2Fcart%2Fcheckout|returnUrl=\/cart\/checkout/);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
});

test('authenticated user with an empty cart cannot place an order', async ({ page }) => {
  let orderRequests = 0;

  await page.route('**/api/cart', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        total: 0,
        count: 0,
      }),
    });
  });

  await page.route('**/api/orders', async (route) => {
    if (route.request().method() === 'POST') {
      orderRequests += 1;
    }
    await route.continue();
  });

  await loginAsAdmin(page);
  await page.goto('/cart/checkout');
  await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible();

  await fillCheckoutForm(page);
  await page.getByRole('button', { name: /place order/i }).click();

  await expect(page.getByRole('status').filter({ hasText: /cart is empty/i })).toBeVisible();
  await expect(page).toHaveURL(/\/cart\/checkout/);
  expect(orderRequests).toBe(0);
});

test('invalid promo code shows validation feedback and does not apply a discount', async ({ page }) => {
  await page.route('**/api/promoCodes?*', async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('code') === 'BADCODE') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Promo code not found' }),
      });
      return;
    }

    await route.continue();
  });

  await loginAsAdmin(page);
  await openCheckoutWithItem(page);

  const promoInput = page.locator('input[formcontrolname="promo"]');
  await promoInput.fill('BADCODE');
  await promoInput.press('Tab');

  await expect.poll(async () => await promoInput.evaluate((el) => el.className)).toMatch(/ng-invalid/);
  await expect(page.getByText(/promo code is not valid/i)).toBeVisible();
  await expect(page.getByText(/promo applied:/i)).toHaveCount(0);
});

test('rapid repeated checkout submits only one order request', async ({ page }) => {
  let orderRequests = 0;

  await page.route('**/api/orders', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    orderRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 999,
        customer: {
          name: 'QA User',
          email: 'qa.user@example.com',
          address: '123 Test Street',
        },
        items: [
          {
            productId: 1,
            title: 'Basic T-Shirt',
            price: 19.99,
            qty: 1,
          },
        ],
        subtotal: 19.99,
        discountPercent: 0,
        total: 19.99,
        status: 'NEW',
        createdAt: '2026-04-10T00:00:00.000Z',
      }),
    });
  });

  await page.route('**/api/cart/clear', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        total: 0,
        count: 0,
      }),
    });
  });

  await loginAsAdmin(page);
  await openCheckoutWithItem(page);
  await fillCheckoutForm(page);

  const placeOrderButton = page.getByRole('button', { name: /place order/i });
  await placeOrderButton.evaluate((button) => {
    button.click();
    button.click();
  });

  await expect(page).toHaveURL(/\/order-success\/999/);
  await expect(page.getByRole('status').filter({ hasText: /order created successfully/i })).toBeVisible();
  expect(orderRequests).toBe(1);
});
