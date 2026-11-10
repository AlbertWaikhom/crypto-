import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { API_BASE, STANDARD_HEADERS, STANDARD_THRESHOLDS, TEST_USERS } from './config.js';
import { createSummaryHandler } from './report.js';

export const options = {
  vus: 3,
  duration: '1m',
  thresholds: STANDARD_THRESHOLDS,
};

export function setup() {
  const loginPayload = JSON.stringify({
    email: TEST_USERS.investor.email,
    password: TEST_USERS.investor.password,
  });

  const res = http.post(`${API_BASE}/auth/login`, loginPayload, {
    headers: STANDARD_HEADERS,
  });

  const success = check(res, {
    'setup login status is 200': (r) => r.status === 200,
    'setup received accessToken': (r) => {
      try {
        return Boolean(JSON.parse(r.body).data.accessToken);
      } catch (_) {
        return false;
      }
    },
  });

  if (!success) {
    throw new Error('Setup failed: Could not log in with test user credentials.');
  }

  const token = JSON.parse(res.body).data.accessToken;
  return { token };
}

export default function (data) {
  const authHeaders = {
    ...STANDARD_HEADERS,
    Authorization: `Bearer ${data.token}`,
  };

  group('01. Public Platform APIs', () => {
    const resHealth = http.get(`${API_BASE}/health`, { headers: STANDARD_HEADERS });
    check(resHealth, { 'health is 200': (r) => r.status === 200 });

    const resConfig = http.get(`${API_BASE}/auth/config`, { headers: STANDARD_HEADERS });
    check(resConfig, { 'auth config is 200': (r) => r.status === 200 });

    const resPlans = http.get(`${API_BASE}/investments/plans`, { headers: STANDARD_HEADERS });
    check(resPlans, {
      'plans status is 200': (r) => r.status === 200,
      'plans has items': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data) && body.data.length > 0;
        } catch (_) {
          return false;
        }
      },
    });

    const resMarket = http.get(`${API_BASE}/market-data/config`, { headers: STANDARD_HEADERS });
    check(resMarket, { 'market-data is 200': (r) => r.status === 200 });

    const resCheckEmail = http.post(
      `${API_BASE}/auth/check-email`,
      JSON.stringify({ email: TEST_USERS.investor.email }),
      { headers: STANDARD_HEADERS },
    );
    check(resCheckEmail, {
      'check-email is 200': (r) => r.status === 200,
      'user exists in db': (r) => JSON.parse(r.body).data.exists === true,
    });
  });

  group('02. Authenticated Investor APIs', () => {
    const resUser = http.get(`${API_BASE}/users/me`, { headers: authHeaders });
    check(resUser, {
      'users/me is 200': (r) => r.status === 200,
      'users/me has email': (r) => JSON.parse(r.body).data.email === TEST_USERS.investor.email,
    });

    const resWallet = http.get(`${API_BASE}/wallet`, { headers: authHeaders });
    check(resWallet, {
      'wallet is 200': (r) => r.status === 200,
      'wallet has balances': (r) => JSON.parse(r.body).data.balances !== undefined,
    });

    const resLedger = http.get(`${API_BASE}/wallet/ledger`, { headers: authHeaders });
    check(resLedger, {
      'ledger is 200': (r) => r.status === 200,
      'ledger is array': (r) => Array.isArray(JSON.parse(r.body).data.entries),
    });

    const resDeposits = http.get(`${API_BASE}/deposits`, { headers: authHeaders });
    check(resDeposits, { 'deposits is 200': (r) => r.status === 200 });

    const resInvestments = http.get(`${API_BASE}/investments`, { headers: authHeaders });
    check(resInvestments, { 'investments is 200': (r) => r.status === 200 });

    const resNotifications = http.get(`${API_BASE}/notifications`, { headers: authHeaders });
    check(resNotifications, { 'notifications is 200': (r) => r.status === 200 });

    const resReferrals = http.get(`${API_BASE}/referrals/overview`, { headers: authHeaders });
    check(resReferrals, { 'referrals is 200': (r) => r.status === 200 });
  });

  sleep(1);
}

export const handleSummary = createSummaryHandler('smoke-test');
