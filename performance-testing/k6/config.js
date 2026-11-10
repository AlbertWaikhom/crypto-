/**
 * k6 Performance Testing Configuration
 * Environment parameters, test credentials, baseline targets, and headers.
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API_BASE = `${BASE_URL}/api/v1`;

export const TEST_USERS = {
  investor: {
    email: __ENV.TEST_USER_EMAIL || 'alice.test@navrix.local',
    password: __ENV.TEST_USER_PASSWORD || 'NavrixUser@123',
    role: 'USER',
  },
  admin: {
    email: __ENV.ADMIN_EMAIL || 'admin@navrix.local',
    password: __ENV.ADMIN_PASSWORD || 'NavrixAdmin@123',
    role: 'ADMIN',
  },
};

export const STANDARD_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'User-Agent': 'k6-load-tester/1.0 (Navrix-Performance-Suite)',
};

/**
 * Standard performance thresholds as required by Senior Performance Testing standards:
 * - Failed requests: < 1%
 * - P95 response time: < 500ms
 * - P99 response time: < 1000ms
 */
export const STANDARD_THRESHOLDS = {
  http_req_failed: ['rate<0.01'], // error rate < 1%
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1000ms
};

export const STRESS_THRESHOLDS = {
  http_req_failed: ['rate<0.05'], // error rate < 5% under heavy stress
  http_req_duration: ['p(95)<1500'], // 95% of requests < 1500ms under extreme concurrency
};
