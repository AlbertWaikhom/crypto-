import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { API_BASE, STANDARD_HEADERS, TEST_USERS } from './config.js';
import { createSummaryHandler } from './report.js';

const isFast = __ENV.EXEC_MODE === 'fast';

export const options = {
  stages: isFast
    ? [
        { duration: '10s', target: 50 },
        { duration: '15s', target: 100 },
        { duration: '15s', target: 200 },
        { duration: '15s', target: 300 },
        { duration: '15s', target: 500 },
        { duration: '10s', target: 0 },
      ]
    : [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 500 },
        { duration: '1m', target: 0 },
      ],
  thresholds: {
    // Safety Circuit Breaker: Automatically abort test if error rate exceeds 15% to protect localhost
    http_req_failed: [{ threshold: 'rate<0.15', abortOnFail: true, delayAbortEval: '10s' }],
    http_req_duration: ['p(95)<2500'],
  },
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
    throw new Error('Stress test setup failed: Login failed.');
  }

  return { token: JSON.parse(res.body).data.accessToken };
}

export default function (data) {
  const authHeaders = {
    ...STANDARD_HEADERS,
    Authorization: `Bearer ${data.token}`,
  };

  group('Stress Workload', () => {
    // High-frequency read queries
    const resHealth = http.get(`${API_BASE}/health`, { headers: STANDARD_HEADERS });
    check(resHealth, { 'health is 200': (r) => r.status === 200 });

    const resPlans = http.get(`${API_BASE}/investments/plans`, { headers: STANDARD_HEADERS });
    check(resPlans, { 'plans is 200': (r) => r.status === 200 });

    const resMe = http.get(`${API_BASE}/users/me`, { headers: authHeaders });
    check(resMe, { 'users/me is 200': (r) => r.status === 200 });

    const resWallet = http.get(`${API_BASE}/wallet`, { headers: authHeaders });
    check(resWallet, { 'wallet is 200': (r) => r.status === 200 });
  });

  sleep(Math.random() * 0.8 + 0.2); // Tight sleep under stress
}

export const handleSummary = createSummaryHandler('stress-test');
