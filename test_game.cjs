const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  // Click Start Playing
  await page.fill('input[placeholder="Your nickname (min. 2 chars)"]', 'TestPlayer');
  await page.click('text=Start Playing');
  await page.waitForTimeout(1000);
  
  // Click MIXED MARATHON
  await page.click('text=Marathon Mode');
  await page.waitForTimeout(1000);
  
  // Click "Start Marathon"
  await page.click('text=Start Marathon');
  await page.waitForTimeout(3000);
  
  console.log('Game loaded. Let it run for a bit...');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
