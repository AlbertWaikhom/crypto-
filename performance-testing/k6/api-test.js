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
  // Login customer
  const resUser = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify({
      email: TEST_USERS.investor.email,
      password: TEST_USERS.investor.password,
    }),
    { headers: STANDARD_HEADERS },
  );

  // Login admin
  const resAdmin = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify({
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password,
    }),
    { headers: STANDARD_HEADERS },
  );

  const userToken = resUser.status === 200 ? JSON.parse(resUser.body).data.accessToken : null;
  const adminToken = resAdmin.status === 200 ? JSON.parse(resAdmin.body).data.accessToken : null;

  return { userToken, adminToken };
}

export default function (tokens) {
  const userHeaders = {
    ...STANDARD_HEADERS,
    Authorization: `Bearer ${tokens.userToken}`,
  };

  const adminHeaders = {
    ...STANDARD_HEADERS,
    Authorization: `Bearer ${tokens.adminToken}`,
  };

  group('A. Core Public Endpoints', () => {
    const resHealth = http.get(`${API_BASE}/health`, {
      headers: STANDARD_HEADERS,
      tags: { endpoint: 'api_health' },
    });
    check(resHealth, { 'health is 200': (r) => r.status === 200 });

    const resPlans = http.get(`${API_BASE}/investments/plans`, {
      headers: STANDARD_HEADERS,
      tags: { endpoint: 'api_plans' },
    });
    check(resPlans, { 'plans is 200': (r) => r.status === 200 });

    const resMarket = http.get(`${API_BASE}/market-data/config`, {
      headers: STANDARD_HEADERS,
      tags: { endpoint: 'api_market_config' },
    });
    check(resMarket, { 'market config is 200': (r) => r.status === 200 });
  });

  group('B. Authenticated Customer Endpoints', () => {
    if (tokens.userToken) {
      const resMe = http.get(`${API_BASE}/users/me`, {
        headers: userHeaders,
        tags: { endpoint: 'api_users_me' },
      });
      check(resMe, { 'users/me is 200': (r) => r.status === 200 });

      const resWallet = http.get(`${API_BASE}/wallet`, {
        headers: userHeaders,
        tags: { endpoint: 'api_wallet' },
      });
      check(resWallet, { 'wallet is 200': (r) => r.status === 200 });

      const resLedger = http.get(`${API_BASE}/wallet/ledger`, {
        headers: userHeaders,
        tags: { endpoint: 'api_wallet_ledger' },
      });
      check(resLedger, { 'wallet/ledger is 200': (r) => r.status === 200 });

      const resNotifications = http.get(`${API_BASE}/notifications`, {
        headers: userHeaders,
        tags: { endpoint: 'api_notifications' },
      });
      check(resNotifications, { 'notifications is 200': (r) => r.status === 200 });
    }
  });

  group('C. Authenticated Admin Analytics Endpoints', () => {
    if (tokens.adminToken) {
      const resAdminDash = http.get(`${API_BASE}/admin/dashboard`, {
        headers: adminHeaders,
        tags: { endpoint: 'api_admin_dashboard' },
      });
      check(resAdminDash, { 'admin dashboard is 200': (r) => r.status === 200 });

      const resMaster = http.get(`${API_BASE}/admin/master/overview`, {
        headers: adminHeaders,
        tags: { endpoint: 'api_admin_master' },
      });
      check(resMaster, { 'master overview is 200': (r) => r.status === 200 });

      const resAdminUsers = http.get(`${API_BASE}/admin/users?page=1&limit=20`, {
        headers: adminHeaders,
        tags: { endpoint: 'api_admin_users' },
      });
      check(resAdminUsers, { 'admin users is 200': (r) => r.status === 200 });
    }
  });

  sleep(0.5);
}

export const handleSummary = createSummaryHandler('api-test');
