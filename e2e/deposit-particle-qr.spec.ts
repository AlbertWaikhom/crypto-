import { test, expect } from '@playwright/test';

test('Verify Deposit Dropdown and Modern Particle QR Code with Center Logo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });

  console.log('1. Logging in as Alice...');
  await page.goto('/login');
  await page.fill('input[type="email"]', 'alice.test@navrix.local');
  await page.fill('input[type="password"]', 'NavrixUser@123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 12000 });
  console.log('2. Navigating to /deposit...');
  await page.goto('/deposit');
  await page.waitForTimeout(2000);

  const dropdownTrigger = page.locator('[class*="dropdownTrigger"]');
  await expect(dropdownTrigger).toBeVisible();

  const methodsGrid = page.locator('[class*="methodsGrid"]');
  expect(await methodsGrid.count()).toBe(0);

  const triggerText = await dropdownTrigger.textContent();
  console.log('Dropdown Trigger Text:', triggerText);
  expect(triggerText).toContain('USDT');
  expect(triggerText).toContain('BEP20');

  const qrCanvas = page.locator('[class*="canvas"]');
  await expect(qrCanvas).toBeVisible();

  await page.waitForTimeout(1800);

  const centerLogo = page.locator('[class*="centerLogoBadge"]');
  await expect(centerLogo).toBeVisible();

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_deposit_particle_qr_bep20.png',
  });
  console.log('Saved BEP-20 particle QR screenshot.');

  // 2. Open the Payment Method Dropdown
  console.log('3. Opening Dropdown...');
  await dropdownTrigger.click();
  await page.waitForTimeout(600);

  const dropdownMenu = page.locator('[class*="dropdownMenu"]');
  await expect(dropdownMenu).toBeVisible();

  // Check multiple wallet options
  const dropdownItems = page.locator('[class*="dropdownItem"]');
  const count = await dropdownItems.count();
  console.log('Dropdown Items Count:', count);
  expect(count).toBeGreaterThan(1);

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_deposit_dropdown_open.png',
  });
  console.log('Saved Dropdown Open screenshot.');

  // 3. Select TRON Network (TRC20)
  console.log('4. Selecting TRC20 wallet...');
  const trcOption = dropdownItems.filter({ hasText: 'TRON' });
  await trcOption.click();
  await page.waitForTimeout(500);

  // Dropdown should close
  await expect(dropdownMenu).not.toBeVisible();

  // Trigger should now show TRC20
  const updatedTriggerText = await dropdownTrigger.textContent();
  console.log('Updated Trigger Text:', updatedTriggerText);
  expect(updatedTriggerText).toContain('TRC20');

  // Wait for new particle re-assembly
  await page.waitForTimeout(1800);
  await expect(centerLogo).toBeVisible();

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_deposit_particle_qr_trc20.png',
  });
  console.log('Saved TRC-20 particle QR screenshot.');

  // 4. Select Bitcoin (BTC)
  console.log('5. Selecting Bitcoin wallet...');
  await dropdownTrigger.click();
  await page.waitForTimeout(400);

  const btcOption = page.locator('[class*="dropdownItem"]').filter({ hasText: 'Bitcoin' });
  await btcOption.click();
  await page.waitForTimeout(1800);

  const btcTriggerText = await dropdownTrigger.textContent();
  console.log('BTC Trigger Text:', btcTriggerText);
  expect(btcTriggerText).toContain('Bitcoin');

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_deposit_particle_qr_btc.png',
  });
  console.log('Saved BTC particle QR screenshot.');

  // 5. Test "Assemble" replay button
  console.log('6. Testing Replay / Assemble button...');
  const replayBtn = page.locator('button:has-text("Assemble")');
  await expect(replayBtn).toBeVisible();
  await replayBtn.click();
  await page.waitForTimeout(800);

  console.log('ALL DEPOSIT TESTS PASSED WITH 100% SUCCESS!');
});
