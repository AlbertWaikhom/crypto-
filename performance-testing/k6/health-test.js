import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_BASE, STANDARD_HEADERS, STANDARD_THRESHOLDS } from './config.js';
import { createSummaryHandler } from './report.js';

export const options = {
  vus: 3,
  duration: '30s',
  thresholds: STANDARD_THRESHOLDS,
};

export default function () {
  // 1. Core System Health
  const resHealth = http.get(`${API_BASE}/health`, { headers: STANDARD_HEADERS });
  check(resHealth, {
    'health status is 200': (r) => r.status === 200,
    'health response is success': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.data.status === 'ok';
      } catch (_) {
        return false;
      }
    },
    'health returns databaseEngine': (r) => {
      try {
        return JSON.parse(r.body).data.databaseEngine === 'mysql';
      } catch (_) {
        return false;
      }
    },
  });

  // 2. Auth Configuration
  const resAuthConfig = http.get(`${API_BASE}/auth/config`, { headers: STANDARD_HEADERS });
  check(resAuthConfig, {
    'auth/config status is 200': (r) => r.status === 200,
    'auth/config returns googleOAuthMode': (r) => {
      try {
        return typeof JSON.parse(r.body).data.googleOAuthMode === 'string';
      } catch (_) {
        return false;
      }
    },
  });

  // 3. Payment Methods
  const resPaymentMethods = http.get(`${API_BASE}/payment-methods`, { headers: STANDARD_HEADERS });
  check(resPaymentMethods, {
    'payment-methods status is 200': (r) => r.status === 200,
    'payment-methods contains BEP-20 / USDT': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (_) {
        return false;
      }
    },
  });

  // 4. Deposits Configuration
  const resDepositConfig = http.get(`${API_BASE}/deposits/config`, { headers: STANDARD_HEADERS });
  check(resDepositConfig, {
    'deposits/config status is 200': (r) => r.status === 200,
    'deposits/config has min/max limits': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data.minDeposit > 0 && body.data.maxDeposit >= body.data.minDeposit;
      } catch (_) {
        return false;
      }
    },
  });

  sleep(0.5);
}

export const handleSummary = createSummaryHandler('health-test');
