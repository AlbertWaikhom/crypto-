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
    throw new Error('Order test setup failed: Unable to log in.');
  }

  const token = JSON.parse(res.body).data.accessToken;
  return { token };
}

export default function (data) {
  const authHeaders = {
    ...STANDARD_HEADERS,
    Authorization: `Bearer ${data.token}`,
  };

  group('1. Query Wallet State & Double-Entry Ledgers', () => {
    const resWallet = http.get(`${API_BASE}/wallet`, {
      headers: authHeaders,
      tags: { endpoint: 'wallet' },
    });

    check(resWallet, {
      'wallet status is 200': (r) => r.status === 200,
      'wallet balances is object': (r) => {
        try {
          const body = JSON.parse(r.body);
          return typeof body.data.balances === 'object';
        } catch (_) {
          return false;
        }
      },
    });

    const resLedger = http.get(`${API_BASE}/wallet/ledger`, {
      headers: authHeaders,
      tags: { endpoint: 'wallet_ledger' },
    });

    check(resLedger, {
      'ledger status is 200': (r) => r.status === 200,
      'ledger entries is array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).data.entries);
        } catch (_) {
          return false;
        }
      },
    });
  });

  group('2. Safe Order History Query', () => {
    const resDeposits = http.get(`${API_BASE}/deposits`, {
      headers: authHeaders,
      tags: { endpoint: 'deposits_list' },
    });

    check(resDeposits, {
      'deposits list status is 200': (r) => r.status === 200,
      'deposits data is array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).data);
        } catch (_) {
          return false;
        }
      },
    });

    const resInvestments = http.get(`${API_BASE}/investments`, {
      headers: authHeaders,
      tags: { endpoint: 'investments_list' },
    });

    check(resInvestments, {
      'investments list status is 200': (r) => r.status === 200,
      'investments data is array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).data);
        } catch (_) {
          return false;
        }
      },
    });
  });

  group('3. Safe Deposit Intent Creation (Disposable Test Record)', () => {
    const testAmount = Math.floor(Math.random() * 50) + 100;
    const payload = JSON.stringify({
      amount: testAmount,
      network: 'BNB_SMART_CHAIN',
    });

    const resCreate = http.post(`${API_BASE}/deposits`, payload, {
      headers: authHeaders,
      tags: { endpoint: 'deposits_create' },
    });

    const created = check(resCreate, {
      'deposit intent status is 201 or 200': (r) => r.status === 200 || r.status === 201,
      'deposit intent returns depositId': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Boolean(body.data.id || body.data.depositId);
        } catch (_) {
          return false;
        }
      },
    });

    if (created) {
      try {
        const body = JSON.parse(resCreate.body);
        const depId = body.data.id || body.data.depositId;
        if (depId) {
          const resDetail = http.get(`${API_BASE}/deposits/${depId}`, {
            headers: authHeaders,
            tags: { endpoint: 'deposits_detail' },
          });
          check(resDetail, {
            'deposit detail is 200': (r) => r.status === 200,
            'deposit has receiving address': (r) => {
              try {
                return Boolean(JSON.parse(r.body).data.receivingAddress);
              } catch (_) {
                return false;
              }
            },
          });
        }
      } catch (_) {}
    }
  });

  sleep(1);
}

export const handleSummary = createSummaryHandler('order-test');
