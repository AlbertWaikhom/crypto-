import { expect, test } from '@playwright/test';

const WEB_URL = process.env.PLAYWRIGHT_WEB_URL || 'http://localhost:3000';
const ADMIN_URL = process.env.PLAYWRIGHT_ADMIN_URL || 'http://localhost:3001';
const RECEIVING_WALLET = '0x98386622d3937c0A3582E07aEc06041C3fb7b521';

test.describe('NAVRIX Full-Stack E2E Browser Workflow (Unified Login + Customer + Admin + Master Admin)', () => {
  const uniqueEmail = `e2e.investor.${Date.now()}@navrix.local`;
  const uniqueTxHash = `0x${Date.now().toString(16).padStart(16, 'a')}${'b'.repeat(48)}`;
  let createdDepositUid = '';

  test('1. Customer registers, views zero-state single-screen dashboard, creates BEP-20 USDT deposit with QR, and submits tx hash for 24h review', async ({
    page,
  }) => {
    await page.goto(`${WEB_URL}/register`);
    await expect(page.getByText('NAVRIX').first()).toBeVisible();

    await page.getByPlaceholder(/full name/i).fill('Playwright Investor');
    await page.getByPlaceholder(/email/i).fill(uniqueEmail);
    await page
      .getByPlaceholder(/min 8 chars/i)
      .first()
      .fill('NavrixUser2026!');
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole('button', { name: /create account/i }).click();

    await page.waitForURL('**/dashboard');
    await expect(page.getByText('Total Balance')).toBeVisible();

    // Navigate to BEP-20 Deposit page
    await page.goto(`${WEB_URL}/deposit`);
    await expect(page.getByText(RECEIVING_WALLET)).toBeVisible();
    await expect(
      page.getByText(/Only send USDT using BNB Smart Chain \(BEP-20\)/i),
    ).toBeVisible();

    // Request 150 USDT deposit
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('150');
    await page.getByRole('button', { name: /create deposit/i }).click();

    await page.waitForURL('**/deposit/DEP-*');
    const urlParts = page.url().split('/');
    createdDepositUid = urlParts[urlParts.length - 1] || '';
    expect(createdDepositUid).toMatch(/^DEP-\d{8}-\d{6}$/);

    // Submit 66-character BSC transaction hash
    await page.getByPlaceholder(/0x/i).fill(uniqueTxHash);
    await page.getByRole('button', { name: /submit payment/i }).click();

    await expect(
      page.getByText(/Your payment has been submitted and is under review/i),
    ).toBeVisible();
  });

  test('2. Master Admin signs into the ONE unified login page (:3000/login), auto-routes to Master Command Center (:3001/master), verifies solvency, and approves deposit', async ({
    page,
  }) => {
    await page.goto(`${WEB_URL}/login`);
    await page.getByPlaceholder(/email|domain/i).fill('masteradmin@navrix.local');
    await page.getByPlaceholder(/••••|password/i).fill('MasterAdmin@123');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await page.waitForURL('**/master');
    await expect(page.getByText(/RECONCILED/i).first()).toBeVisible();

    // Open Deposit Review page and verify + approve
    if (createdDepositUid) {
      await page.goto(`${ADMIN_URL}/deposits/${createdDepositUid}`);
      await page
        .getByRole('button', { name: /verify on blockchain/i })
        .click();
      await page.getByRole('button', { name: /approve deposit/i }).click();
      await expect(page.getByText('APPROVED')).toBeVisible();
    }
  });

  test('3. Customer signs into unified login (:3000/login), sees updated invested balance, and accesses withdrawal request screen', async ({
    page,
  }) => {
    await page.goto(`${WEB_URL}/login`);
    await page.getByPlaceholder(/email|domain/i).fill(uniqueEmail);
    await page.getByPlaceholder(/••••|password/i).fill('NavrixUser2026!');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await page.waitForURL('**/dashboard');
    await expect(page.getByText(/150\.00/).first()).toBeVisible();

    await page.goto(`${WEB_URL}/withdraw`);
    await expect(page.getByText(/BNB Smart Chain/i).first()).toBeVisible();
  });
});
