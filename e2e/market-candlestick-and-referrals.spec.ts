import { test, expect } from '@playwright/test';

test('Full Verification: Japanese Candlesticks, Instant Switching (BTC/BNB/ETH/SOL), Timeframe, and Referrals', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });

  console.log('1. Logging in as Alice...');
  await page.goto('/login');
  await page.fill('input[type="email"]', 'alice.test@navrix.local');
  await page.fill('input[type="password"]', 'NavrixUser@123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 12000 });
  await page.waitForTimeout(2500);

  // 1. Verify BTC Candlestick Chart
  console.log('1. Checking BTC Candlestick Chart...');
  const btcPriceEl = page.locator('[class*="livePrice"]');
  await expect(btcPriceEl).toBeVisible();
  const btcPriceText = await btcPriceEl.textContent();
  console.log('BTC Price Metric:', btcPriceText);
  expect(btcPriceText).toContain('$');

  const btcHud = page.locator('text=BTC/USDT');
  await expect(btcHud).toBeVisible();

  // Verify Candlestick rects and wicks are present
  const candleRects = page.locator('svg rect');
  const rectCount = await candleRects.count();
  console.log('Candle rects count (BTC):', rectCount);
  expect(rectCount).toBeGreaterThan(15);

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_candlestick_chart_btc.png',
  });

  // 2. Switch to BNB / USDT
  console.log('2. Switching to BNB / USDT...');
  await page.locator('button[class*="symbolTab"]').filter({ hasText: 'BNB' }).click();
  await page.waitForTimeout(2500);

  const bnbPriceEl = page.locator('[class*="livePrice"]');
  const bnbPriceText = await bnbPriceEl.textContent();
  console.log('BNB Price Metric:', bnbPriceText);
  expect(bnbPriceText).toContain('$');
  expect(bnbPriceText).not.toContain('74,');

  const bnbHud = page.locator('text=BNB/USDT');
  await expect(bnbHud).toBeVisible();

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_candlestick_chart_bnb.png',
  });

  // 3. Switch to ETH / USDT
  console.log('3. Switching to ETH / USDT...');
  await page.locator('button[class*="symbolTab"]').filter({ hasText: 'ETH' }).click();
  await page.waitForTimeout(2500);

  const ethPriceEl = page.locator('[class*="livePrice"]');
  const ethPriceText = await ethPriceEl.textContent();
  console.log('ETH Price Metric:', ethPriceText);
  expect(ethPriceText).toContain('$');
  expect(ethPriceText).not.toContain('689.');

  const ethHud = page.locator('text=ETH/USDT');
  await expect(ethHud).toBeVisible();

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_candlestick_chart_eth.png',
  });

  // 4. Switch to SOL / USDT
  console.log('4. Switching to SOL / USDT...');
  await page.locator('button[class*="symbolTab"]').filter({ hasText: 'SOL' }).click();
  await page.waitForTimeout(2500);

  const solPriceEl = page.locator('[class*="livePrice"]');
  const solPriceText = await solPriceEl.textContent();
  console.log('SOL Price Metric:', solPriceText);
  expect(solPriceText).toContain('$');

  const solHud = page.locator('text=SOL/USDT');
  await expect(solHud).toBeVisible();

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_candlestick_chart_sol.png',
  });

  // 5. Test Timeframe Switching to 15m
  console.log('5. Switching interval to 15m...');
  await page.click('button:has-text("15m")');
  await page.waitForTimeout(2500);

  const intervalHud = page.locator('text=[15m]');
  await expect(intervalHud).toBeVisible();

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_candlestick_chart_15m.png',
  });

  // 6. Navigate to Refer & Earn (/referrals)
  console.log('6. Navigating to /referrals...');
  await page.goto('/referrals');
  await page.waitForTimeout(2500);

  const linkInput = page.locator('input[readonly]');
  await expect(linkInput).toBeVisible();
  const linkVal = await linkInput.inputValue();
  console.log('Referral link value:', linkVal);
  expect(linkVal).toContain('http');
  expect(linkVal).not.toBe('Loading...');

  const codeEl = page.locator('text=Referral Code:').locator('..');
  const codeText = await codeEl.textContent();
  console.log('Referral code text:', codeText);
  expect(codeText).toContain('NVX000003');

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_referrals_overview_resolved.png',
    fullPage: false,
  });

  console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
});
