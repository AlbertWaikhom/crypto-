import { test, expect } from '@playwright/test';

test('Verify Sign Out Confirmation Modal (Exit & Deny)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });

  console.log('1. Logging in as Alice...');
  await page.goto('/login');
  await page.fill('input[type="email"]', 'alice.test@navrix.local');
  await page.fill('input[type="password"]', 'NavrixUser@123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 12000 });
  await page.waitForTimeout(2000);

  // 1. Locate and click "Sign Out" in the sidebar
  console.log('2. Clicking Sign Out button...');
  const signOutBtn = page.locator('button:has-text("Sign Out")');
  await expect(signOutBtn).toBeVisible();
  await signOutBtn.click();
  await page.waitForTimeout(500);

  // 2. Verify Confirmation Modal is open
  const modalTitle = page.locator('h2#signout-modal-title');
  await expect(modalTitle).toBeVisible();
  expect(await modalTitle.textContent()).toContain('Sign Out Confirmation');

  const denyBtn = page.locator('button:has-text("Deny")');
  await expect(denyBtn).toBeVisible();

  const exitBtn = page.locator('button:has-text("Exit")');
  await expect(exitBtn).toBeVisible();

  // Save screenshot of the open confirmation modal
  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_signout_modal_open.png',
  });
  console.log('Saved screenshot of Sign Out Confirmation Modal.');

  // 3. Test "Deny" button: user should stay on dashboard
  console.log('3. Clicking Deny button...');
  await denyBtn.click();
  await page.waitForTimeout(500);

  // Modal should close
  await expect(modalTitle).not.toBeVisible();
  // Still on dashboard
  expect(page.url()).toContain('/dashboard');
  console.log('Deny successfully kept user on dashboard.');

  // 4. Test "Exit" button: user confirms sign out and gets redirected to /login
  console.log('4. Clicking Sign Out again and clicking Exit...');
  await signOutBtn.click();
  await page.waitForTimeout(500);
  await expect(modalTitle).toBeVisible();

  await exitBtn.click();
  await page.waitForURL('**/login', { timeout: 8000 });
  expect(page.url()).toContain('/login');
  console.log('Exit successfully logged user out and redirected to /login.');

  await page.screenshot({
    path: 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7/verify_signout_redirect_login.png',
  });

  console.log('ALL SIGN OUT MODAL TESTS PASSED WITH 100% SUCCESS!');
});
