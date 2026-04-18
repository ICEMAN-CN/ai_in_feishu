import { test, expect } from '@playwright/test';

const ADMIN_API_KEY = 'demo-admin-login';
const VITE_URL = 'http://localhost:5173/admin';

test.describe('Admin 认证模块 (Vite Dev Server)', () => {
  test.beforeEach(async ({ page }) => {
    // 清理 localStorage 并导航到登录页
    await page.goto(`${VITE_URL}/login`);
    await page.evaluate(() => localStorage.clear());
    // 等待 React 挂载
    await page.waitForSelector('#apiKey', { timeout: 15000 });
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('AUTH-001: 使用正确 API Key 登录', async ({ page }) => {
    console.log('  开始登录测试...');
    await page.fill('#apiKey', ADMIN_API_KEY);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('ai-feishu-admin-auth'));
    expect(token).toBeTruthy();
    console.log('✅ AUTH-001 通过：登录成功，跳转到 Dashboard');
  });

  test('AUTH-002: 使用错误 API Key 登录', async ({ page }) => {
    await page.fill('#apiKey', 'wrong-api-key');
    await page.click('button[type="submit"]');
    await expect(page.locator('p.text-red-500')).toBeVisible({ timeout: 5000 });
    const errorText = await page.locator('p.text-red-500').textContent();
    expect(errorText).toContain('Invalid API key');
    await expect(page).toHaveURL(/login/);
    console.log('✅ AUTH-002 通过：错误 API Key 被正确拒绝');
  });

  test('AUTH-003: 登录后刷新页面 - 关键路径', async ({ page }) => {
    await page.fill('#apiKey', ADMIN_API_KEY);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    console.log('  登录成功，当前 URL:', page.url());
    await page.reload();
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    console.log('  刷新后 URL:', currentUrl);
    if (currentUrl.includes('dashboard')) {
      console.log('✅ AUTH-003 通过：刷新后保持在 Dashboard');
    } else {
      throw new Error(`AUTH-003 失败：刷新后应保持在 Dashboard，实际跳转到 ${currentUrl}`);
    }
  });

  test('AUTH-004: Token 过期后刷新', async ({ page }) => {
    await page.fill('#apiKey', ADMIN_API_KEY);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    await page.evaluate(() => {
      const stored = localStorage.getItem('ai-feishu-admin-auth');
      if (stored) {
        const data = JSON.parse(stored);
        data.state.expiresAt = Date.now() - 1000;
        localStorage.setItem('ai-feishu-admin-auth', JSON.stringify(data));
      }
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    console.log('  Token 过期后刷新 URL:', currentUrl);
    if (currentUrl.includes('login')) {
      console.log('✅ AUTH-004 通过：Token 过期后正确跳转到登录页');
    } else {
      throw new Error(`AUTH-004 失败：Token 过期后应跳转到登录页，实际跳转到 ${currentUrl}`);
    }
  });

  test('AUTH-005: 未登录直接访问 Dashboard', async ({ page }) => {
    await page.goto(`${VITE_URL}/dashboard`);
    await page.waitForURL(/login/, { timeout: 10000 });
    const currentUrl = page.url();
    console.log('  未登录访问 Dashboard 后 URL:', currentUrl);
    if (currentUrl.includes('login')) {
      console.log('✅ AUTH-005 通过：未登录正确跳转到登录页');
    } else {
      throw new Error(`AUTH-005 失败：未登录应跳转到登录页，实际跳转到 ${currentUrl}`);
    }
  });

  test('AUTH-006: 登出功能', async ({ page }) => {
    await page.fill('#apiKey', ADMIN_API_KEY);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    const logoutButton = page.locator('button:has-text("登出"), button:has-text("Logout"), button:has-text("Sign out")');
    await logoutButton.click();
    await page.waitForURL(/login/, { timeout: 5000 });
    const token = await page.evaluate(() => localStorage.getItem('ai-feishu-admin-auth'));
    if (!token || JSON.parse(token).state.token === null) {
      console.log('✅ AUTH-006 通过：登出功能正常');
    } else {
      throw new Error('AUTH-006 失败：登出后 token 未清除');
    }
  });
});
