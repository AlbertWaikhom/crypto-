import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { API_BASE, STANDARD_HEADERS, STANDARD_THRESHOLDS } from './config.js';
import { createSummaryHandler } from './report.js';

export const options = {
  stages: [
    { duration: '15s', target: 10 },
    { duration: '30s', target: 25 },
    { duration: '15s', target: 0 },
  ],
  thresholds: STANDARD_THRESHOLDS,
};

export default function () {
  group('1. Investment Vault Plans Catalog', () => {
    const res = http.get(`${API_BASE}/investments/plans`, {
      headers: STANDARD_HEADERS,
      tags: { endpoint: 'investment_plans' },
    });

    check(res, {
      'plans status is 200': (r) => r.status === 200,
      'plans payload success is true': (r) => {
        try {
          return JSON.parse(r.body).success === true;
        } catch (_) {
          return false;
        }
      },
      'plans array contains active vaults': (r) => {
        try {
          const plans = JSON.parse(r.body).data.plans;
          return Array.isArray(plans) && plans.length > 0;
        } catch (_) {
          return false;
        }
      },
      'each plan has required APY & limits': (r) => {
        try {
          const plans = JSON.parse(r.body).data.plans;
          return plans.every((p) => p.name && p.minAmount >= 0 && p.dailyInterestRate > 0);
        } catch (_) {
          return false;
        }
      },
    });
  });

  group('2. Market Data & Asset Feed Config', () => {
    const res = http.get(`${API_BASE}/market-data/config`, {
      headers: STANDARD_HEADERS,
      tags: { endpoint: 'market_data' },
    });

    check(res, {
      'market-data status is 200': (r) => r.status === 200,
      'market-data has symbols': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && body.data !== null;
        } catch (_) {
          return false;
        }
      },
    });
  });

  group('3. Payment Gateways & Chains', () => {
    const res = http.get(`${API_BASE}/payment-methods`, {
      headers: STANDARD_HEADERS,
      tags: { endpoint: 'payment_methods' },
    });

    check(res, {
      'payment-methods status is 200': (r) => r.status === 200,
      'supports BEP-20 chain': (r) => {
        try {
          const methods = JSON.parse(r.body).data;
          return methods.some((m) => m.network === 'BNB_SMART_CHAIN' || m.id === 'usdt_bep20');
        } catch (_) {
          return false;
        }
      },
    });
  });

  group('4. Deposit Limits & Network Rules', () => {
    const res = http.get(`${API_BASE}/deposits/config`, {
      headers: STANDARD_HEADERS,
      tags: { endpoint: 'deposits_config' },
    });

    check(res, {
      'deposits/config status is 200': (r) => r.status === 200,
      'valid min/max deposit range': (r) => {
        try {
          const d = JSON.parse(r.body).data;
          return d.minDeposit >= 10 && d.maxDeposit <= 100000;
        } catch (_) {
          return false;
        }
      },
    });
  });

  sleep(0.5);
}

export const handleSummary = createSummaryHandler('product-test');
