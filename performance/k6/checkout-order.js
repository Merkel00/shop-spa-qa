import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import exec from 'k6/execution';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const SHIPPING_ADDRESS = __ENV.SHIPPING_ADDRESS || 'Main street 1';
const REGISTER_PASSWORD = 'secret123';
const REGISTER_NAME = 'K6 User';

const checkoutOrderDuration = new Trend('checkout_order_duration');
const checkoutOrderSuccess = new Rate('checkout_order_success');
const checkoutOrderShapeValid = new Rate('checkout_order_shape_valid');

export const options = {
  scenarios: {
    normal_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
    },
    peak_load: {
      executor: 'constant-vus',
      vus: 8,
      duration: '1m',
      startTime: '1m10s',
    },
    spike_load: {
      executor: 'ramping-vus',
      startVUs: 3,
      stages: [
        { duration: '15s', target: 12 },
        { duration: '15s', target: 3 },
      ],
      startTime: '2m20s',
    },
    endurance: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      startTime: '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<2000'],
    checkout_order_success: ['rate>0.90'],
    checkout_order_shape_valid: ['rate>0.98'],
  },
};

function parseJson(response, fallback = {}) {
  try {
    return response.json();
  } catch (_) {
    return fallback;
  }
}

function selectProduct(products) {
  if (!Array.isArray(products)) {
    return null;
  }

  const activeInStockProduct = products.find(
    (product) => product && product.active === true && Number(product.stock) > 0,
  );

  if (activeInStockProduct) {
    return activeInStockProduct;
  }

  return (
    products.find((product) => product && Number(product.stock) > 0) || null
  );
}

function createUniqueEmail() {
  const vu = exec.vu.idInTest;
  const iteration = exec.vu.iterationInScenario;
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1e6);

  return `k6_user_${vu}_${iteration}_${timestamp}${random}@test.local`.toLowerCase();
}

function safeTruncateJson(value, maxLength = 500) {
  let serialized = '';

  try {
    serialized = JSON.stringify(value);
  } catch (_) {
    serialized = '[unserializable response body]';
  }

  if (typeof serialized !== 'string') {
    serialized = String(serialized);
  }

  return serialized.length > maxLength
    ? `${serialized.slice(0, maxLength)}...`
    : serialized;
}

export default function () {
  const productsResponse = http.get(`${BASE_URL}/api/products/all`);
  const productsBody = parseJson(productsResponse, []);

  check(productsResponse, {
    'products request succeeded': (r) => r.status === 200,
  });

  if (productsResponse.status !== 200) {
    fail(`Products request failed with status ${productsResponse.status}`);
  }

  const selectedProduct = selectProduct(productsBody);

  check(selectedProduct, {
    'selected product exists': (product) => Boolean(product && product.id),
  });

  if (!selectedProduct || !selectedProduct.id) {
    fail('No suitable product found with stock > 0');
  }

  const registerPayload = JSON.stringify({
    email: createUniqueEmail(),
    password: REGISTER_PASSWORD,
    name: REGISTER_NAME,
  });

  const registerResponse = http.post(`${BASE_URL}/api/auth/register`, registerPayload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const registerBody = parseJson(registerResponse);
  const token = registerBody.token;

  check(registerResponse, {
    'registration status is 201': (r) => r.status === 201,
    'registration response contains token': () => Boolean(token),
  });

  if (registerResponse.status !== 201 || !token) {
    fail(`Registration failed with status ${registerResponse.status}`);
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const cartPayload = JSON.stringify({
    productId: selectedProduct.id,
    qty: 1,
  });

  const cartResponse = http.post(`${BASE_URL}/api/cart/items`, cartPayload, {
    headers: authHeaders,
  });

  check(cartResponse, {
    'add to cart succeeded': (r) => r.status >= 200 && r.status < 300,
  });

  if (cartResponse.status < 200 || cartResponse.status >= 300) {
    fail(`Add to cart failed with status ${cartResponse.status}`);
  }

  const orderPayload = JSON.stringify({
    shippingAddress: SHIPPING_ADDRESS,
    promoCode: null,
  });

  const orderResponse = http.post(`${BASE_URL}/api/orders`, orderPayload, {
    headers: authHeaders,
  });
  const orderBody = parseJson(orderResponse);
  const orderSucceeded = orderResponse.status >= 200 && orderResponse.status < 300;
  const orderHasId = Boolean(orderBody.id);
  const orderHasStatus = Boolean(orderBody.status);
  const orderHasTotal = orderBody.total !== undefined && orderBody.total !== null;

  checkoutOrderDuration.add(orderResponse.timings.duration);
  checkoutOrderSuccess.add(orderSucceeded && orderHasId);
  checkoutOrderShapeValid.add(orderHasId && orderHasStatus && orderHasTotal);

  check(orderResponse, {
    'order creation succeeded': (r) => r.status >= 200 && r.status < 300,
    'order response contains id': () => orderHasId,
    'order response contains status': () => orderHasStatus,
    'order response contains total': () => orderHasTotal,
  });

  if (!orderSucceeded) {
    fail(`Order creation failed with status ${orderResponse.status}`);
  }

  if (!orderHasId || !orderHasTotal) {
    console.error(
      `Order response shape anomaly: scenario=${exec.scenario.name} status=${orderResponse.status} productId=${selectedProduct.id || 'unknown'} body=${safeTruncateJson(orderBody)}`,
    );
  }

  sleep(1);
}
