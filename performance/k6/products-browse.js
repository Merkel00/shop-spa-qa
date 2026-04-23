import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

const productsBrowseDuration = new Trend('products_browse_duration');
const productsBrowseSuccess = new Rate('products_browse_success');

export const options = {
  scenarios: {
    normal_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
    },
    peak_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1m',
      startTime: '1m10s',
    },
    spike_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '15s', target: 30 },
        { duration: '15s', target: 5 },
      ],
      startTime: '2m20s',
    },
    endurance: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      startTime: '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
    products_browse_success: ['rate>0.95'],
  },
};

function parseJson(response, fallback = []) {
  try {
    return response.json();
  } catch (_) {
    return fallback;
  }
}

export default function () {
  const response = http.get(`${BASE_URL}/api/products/all`);
  const body = parseJson(response);
  const isArrayResponse = Array.isArray(body);
  const isNonEmptyArray = isArrayResponse && body.length > 0;
  const hasProductWithId = isArrayResponse && body.some((product) => product && product.id);
  const stockFieldPresent = isArrayResponse && body.some((product) => product && product.stock !== undefined);
  const hasStockBearingProduct = isArrayResponse && body.some((product) => product && Number(product.stock) > 0);
  const isSuccessfulBrowse = response.status === 200 && isNonEmptyArray;

  productsBrowseDuration.add(response.timings.duration);
  productsBrowseSuccess.add(isSuccessfulBrowse);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response is an array': () => isArrayResponse,
    'array is not empty': () => isNonEmptyArray,
    'at least one product has an id': () => hasProductWithId,
    'stock-bearing products exist when stock field is present': () => !stockFieldPresent || hasStockBearingProduct,
  });

  sleep(1);
}
