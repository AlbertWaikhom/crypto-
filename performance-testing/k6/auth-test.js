import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { API_BASE, STANDARD_HEADERS, STANDARD_THRESHOLDS, TEST_USERS } from './config.js';
import { createSummaryHandler } from './report.js';

export const options = {
  stages: [
    { duration: '15s', target: 5 },
    { duration: '30s', target: 15 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    ...STANDARD_THRESHOLDS,
    'http_req_duration{endpoint:login}': ['p(95)<600'], // bcrypt password hashing takes ~70-150ms on CPU
  },
};

export function setup() {
  // Verify credentials in setup
  const res = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify({
      email: TEST_USERS.investor.email,
      password: TEST_USERS.investor.password,
    }),
    { headers: STANDARD_HEADERS },
  );

  if (res.status !== 200) {
    throw new Error(`Auth setup failed with status ${res.status}: ${res.body}`);
  }

  const token = JSON.parse(res.body).data.accessToken;
  return { token };
}

export default function (data) {
  group('1. Email Pre-check Query', () => {
    const res = http.post(
      `${API_BASE}/auth/check-email`,
      JSON.stringify({ email: TEST_USERS.investor.email }),
      {
        headers: STANDARD_HEADERS,
        tags: { endpoint: 'check_email' },
      },
    );
    check(res, {
      'check-email status is 200': (r) => r.status === 200,
      'check-email response exists': (r) => {
        try {
          return JSON.parse(r.body).data.exists === true;
        } catch (_) {
          return false;
        }
      },
    });
  });

  group('2. Primary Password Login', () => {
    const payload = JSON.stringify({
      email: TEST_USERS.investor.email,
      password: TEST_USERS.investor.password,
    });

    const res = http.post(`${API_BASE}/auth/login`, payload, {
      headers: STANDARD_HEADERS,
      tags: { endpoint: 'login' },
    });

    check(res, {
      'login status is 200': (r) => r.status === 200,
      'login returned accessToken': (r) => {
        try {
          return Boolean(JSON.parse(r.body).data.accessToken);
        } catch (_) {
          return false;
        }
      },
      'login returned user profile': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data.user && body.data.user.email === TEST_USERS.investor.email;
        } catch (_) {
          return false;
        }
      },
    });
  });

  group('3. Protected Session Management', () => {
    const res = http.get(`${API_BASE}/auth/sessions`, {
      headers: {
        ...STANDARD_HEADERS,
        Authorization: `Bearer ${data.token}`,
      },
      tags: { endpoint: 'sessions' },
    });

    check(res, {
      'sessions status is 200': (r) => r.status === 200,
      'sessions is array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).data);
        } catch (_) {
          return false;
        }
      },
    });
  });

  sleep(1);
}

export const handleSummary = createSummaryHandler('auth-test');
