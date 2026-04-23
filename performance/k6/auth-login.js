import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_EMAIL = __ENV.AUTH_EMAIL || 'admin@shop.local';
const AUTH_PASSWORD = __ENV.AUTH_PASSWORD || 'admin';
const authLoginDuration = new Trend('auth_login_duration');
const authLoginSuccess = new Rate('auth_login_success');

export const options = {
  scenarios: {
    normal_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
    },
    peak_load: {
      executor: 'constant-vus',
      vus: 25,
      duration: '1m',
      startTime: '1m10s',
    },
    spike_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '15s', target: 40 },
        { duration: '15s', target: 5 },
      ],
      startTime: '2m20s',
    },
    endurance: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      startTime: '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
    auth_login_success: ['rate>0.95'],
  },
};

export default function () {
  const payload = JSON.stringify({
    email: AUTH_EMAIL,
    password: AUTH_PASSWORD,
  });

  const response = http.post(`${BASE_URL}/api/auth/login`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  let body = {};
  try {
    body = response.json();
  } catch (_) {
    body = {};
  }

  const hasToken = Boolean(body.token);
  const isSuccessfulLogin = response.status === 200 && hasToken;

  authLoginDuration.add(response.timings.duration);
  authLoginSuccess.add(isSuccessfulLogin);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response JSON contains token': () => hasToken,
    'response JSON contains user': () => Boolean(body.user),
  });

  sleep(1);
}
