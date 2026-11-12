const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  
  const artifactDir = 'C:/Users/iamal/.gemini/antigravity/brain/0e8a19cf-e3c4-4fcc-ab28-2c2fff3b39c7';

  // Test on standard 390px mobile viewport (iPhone 14/15/16)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // 1. Mobile Header Closed (390px)
  await page.screenshot({ path: `${artifactDir}/mobile_header_closed.png` });
  console.log('Saved mobile_header_closed.png');

  // 2. Open Mobile Menu
  const menuBtn = await page.$('button[aria-label="Toggle Navigation Menu"]');
  if (menuBtn) {
    await menuBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${artifactDir}/mobile_header_menu_open.png` });
    console.log('Saved mobile_header_menu_open.png');

    // 3. Expand Platform Engines Dropdown
    const platformTrigger = await page.$('button[aria-expanded]:has-text("Platform Engines")');
    if (platformTrigger) {
      await platformTrigger.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${artifactDir}/mobile_header_platform_expanded.png` });
      console.log('Saved mobile_header_platform_expanded.png');
    }

    // 4. Expand Governance Dropdown
    const govTrigger = await page.$('button[aria-expanded]:has-text("Resources & Legal Governance")');
    if (govTrigger) {
      await govTrigger.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${artifactDir}/mobile_header_governance_expanded.png` });
      console.log('Saved mobile_header_governance_expanded.png');
    }
  }

  // Also test 360px small mobile viewport (e.g. Galaxy S / small Android)
  const context360 = await browser.newContext({
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2
  });
  const page360 = await context360.newPage();
  await page360.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page360.screenshot({ path: `${artifactDir}/mobile_header_closed_360.png` });
  console.log('Saved mobile_header_closed_360.png');

  // 5. Test Portal Header on mobile with authentication
  try {
    const loginRes = await page.request.post('http://localhost:3000/api/v1/auth/login', {
      data: {
        email: 'alice.test@navrix.local',
        password: 'NavrixUser@123'
      }
    });
    const loginJson = await loginRes.json();
    if (loginJson.success && loginJson.data?.accessToken) {
      const token = loginJson.data.accessToken;
      const user = loginJson.data.user;

      await page.evaluate(({ token, user }) => {
        sessionStorage.setItem('navrix_access_token', token);
        sessionStorage.setItem('navrix_user', JSON.stringify(user));
      }, { token, user });

      await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${artifactDir}/mobile_portal_header.png` });
      console.log('Saved mobile_portal_header.png');

      const portalTitleBtn = await page.$('button[aria-label="Toggle page telemetry and quick actions"]');
      if (portalTitleBtn) {
        await portalTitleBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${artifactDir}/mobile_portal_header_dropdown.png` });
        console.log('Saved mobile_portal_header_dropdown.png');
      }
    }
  } catch (err) {
    console.error('Portal auth test error:', err.message);
  }

  await browser.close();
  console.log('Verification completed successfully.');
})();
