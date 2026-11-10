import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { API_BASE, STANDARD_HEADERS, TEST_USERS } from './config.js';
import { createSummaryHandler } from './report.js';

export const options = {
  stages: [
    { duration: '10s', target: 10 }, // 1. Baseline normal traffic
    { duration: '5s', target: 200 }, // 2. Sudden massive spike in 5s!
    { duration: '30s', target: 200 }, // 3. Sustained shockwave peak
    { duration: '5s', target: 10 }, // 4. Instant drop back
    { duration: '15s', target: 10 }, // 5. Recovery observation window
    { duration: '5s', target: 0 }, // 6. Ramp down
  ],
  thresholds: {
    // Monitor spike behavior: allows temporary degradation during shockwave, but server must stay alive
    http_req_failed: [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '15s' }],
    http_req_duration: ['p(95)<3000'],
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
    throw new Error('Spike test setup failed: Login failed.');
  }

  return { token: JSON.parse(res.body).data.accessToken };
}

export default function (data) {
  const authHeaders = {
    ...STANDARD_HEADERS,
    Authorization: `Bearer ${data.token}`,
  };

  group('Spike Workload', () => {
    // 1. Light health check
    const resHealth = http.get(`${API_BASE}/health`, { headers: STANDARD_HEADERS });
    check(resHealth, { 'health 200': (r) => r.status === 200 });

    // 2. Medium public endpoint
    const resPlans = http.get(`${API_BASE}/investments/plans`, { headers: STANDARD_HEADERS });
    check(resPlans, { 'plans 200': (r) => r.status === 200 });

    // 3. Database read endpoint
    const resMe = http.get(`${API_BASE}/users/me`, { headers: authHeaders });
    check(resMe, { 'users/me 200': (r) => r.status === 200 });
  });

  sleep(Math.random() * 0.5 + 0.2);
}

export const handleSummary = createSummaryHandler('spike-test');
