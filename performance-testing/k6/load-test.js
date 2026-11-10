import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { API_BASE, STANDARD_HEADERS, STANDARD_THRESHOLDS, TEST_USERS } from './config.js';
import { createSummaryHandler } from './report.js';

// Scaled options: allows full 9-minute run or quick benchmark via __ENV.EXEC_MODE
const isFast = __ENV.EXEC_MODE === 'fast';

export const options = {
  stages: isFast
    ? [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 25 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
      ]
    : [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 25 },
        { duration: '3m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 0 },
      ],
  thresholds: STANDARD_THRESHOLDS,
};

export function setup() {
  const res = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify({
      email: TEST_USERS.investor.email,
      password: TEST_USERS.investor.password,
    }),
    { headers: STANDARD_HEADERS },
  );

  if (res.status !== 200) {
    throw new Error('Load test setup failed: Could not log in.');
  }

  return { token: JSON.parse(res.body).data.accessToken };
}

export default function (data) {
  const authHeaders = {
    ...STANDARD_HEADERS,
    Authorization: `Bearer ${data.token}`,
  };

  // Simulate realistic user behavior: 70% browsing public catalog & market, 30% interacting with portfolio
  group('1. Public Browsing Flow', () => {
    const resHealth = http.get(`${API_BASE}/health`, { headers: STANDARD_HEADERS });
    check(resHealth, { 'health status 200': (r) => r.status === 200 });

    const resPlans = http.get(`${API_BASE}/investments/plans`, { headers: STANDARD_HEADERS });
    check(resPlans, { 'plans status 200': (r) => r.status === 200 });

    const resMarket = http.get(`${API_BASE}/market-data/config`, { headers: STANDARD_HEADERS });
    check(resMarket, { 'market config 200': (r) => r.status === 200 });

    const resPayment = http.get(`${API_BASE}/payment-methods`, { headers: STANDARD_HEADERS });
    check(resPayment, { 'payment methods 200': (r) => r.status === 200 });
  });

  group('2. Authenticated Portfolio Operations', () => {
    const resMe = http.get(`${API_BASE}/users/me`, { headers: authHeaders });
    check(resMe, { 'users/me 200': (r) => r.status === 200 });

    const resWallet = http.get(`${API_BASE}/wallet`, { headers: authHeaders });
    check(resWallet, { 'wallet 200': (r) => r.status === 200 });

    const resLedger = http.get(`${API_BASE}/wallet/ledger`, { headers: authHeaders });
    check(resLedger, { 'ledger 200': (r) => r.status === 200 });

    const resNotifications = http.get(`${API_BASE}/notifications`, { headers: authHeaders });
    check(resNotifications, { 'notifications 200': (r) => r.status === 200 });
  });

  sleep(Math.random() * 1.5 + 0.5); // Random human-like think time (0.5s - 2.0s)
}

export const handleSummary = createSummaryHandler('load-test');
