const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--auto-open-devtools-for-tabs']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Navigating to Vite dev server...');
  await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle' });

  console.log('Waiting 10 seconds...');
  await page.waitForTimeout(10000);

  console.log('Taking screenshot...');
  await page.screenshot({ path: '/tmp/login-page.png', fullPage: true });

  console.log('URL:', page.url());
  console.log('Screenshot saved to /tmp/login-page.png');

  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.substring(0, 500) : 'root not found';
  });
  console.log('Root content:', rootContent);

  console.log('\nPress Enter to close...');
  await new Promise(resolve => process.stdin.once('data', resolve));
  await browser.close();
})();
