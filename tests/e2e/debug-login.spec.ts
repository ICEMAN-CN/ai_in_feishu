import { test, expect } from '@playwright/test';

const ADMIN_API_KEY = 'demo-admin-login';
const ADMIN_URL = 'http://localhost:3000/admin';

test('调试: 检查登录页加载', async ({ page }) => {
  // 直接访问登录页
  await page.goto(`${ADMIN_URL}/login`);

  // 等待页面完全加载
  await page.waitForLoadState('networkidle');

  // 打印页面 URL
  console.log('当前 URL:', page.url());

  // 等待输入框出现
  try {
    await page.waitForSelector('#apiKey', { timeout: 5000 });
    console.log('✅ 找到 #apiKey 输入框');
  } catch (e) {
    console.log('❌ 未找到 #apiKey 输入框');
    // 打印页面内容
    const content = await page.content();
    console.log('页面内容 (前1000字符):', content.substring(0, 1000));
  }
});

test('调试: 未登录访问 Dashboard', async ({ page }) => {
  await page.goto(`${ADMIN_URL}/dashboard`);

  // 等待一段时间让 hydration 完成
  await page.waitForTimeout(3000);

  console.log('当前 URL after wait:', page.url());

  // 检查页面内容
  const bodyText = await page.locator('body').textContent();
  console.log('Body text:', bodyText?.substring(0, 200));
});
