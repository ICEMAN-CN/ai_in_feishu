import { test, expect } from '@playwright/test';

const ADMIN_API_KEY = 'demo-admin-login';
const ADMIN_URL = 'http://localhost:3000/admin';

test.describe('Admin 认证模块', () => {
  test.beforeEach(async ({ page }) => {
    // 清理 localStorage
    await page.goto(`${ADMIN_URL}/login`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // 等待 React 挂载
    await page.waitForSelector('#apiKey', { timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    // 清理
    await page.evaluate(() => localStorage.clear());
  });

  test('AUTH-001: 使用正确 API Key 登录', async ({ page }) => {
    // 输入正确的 API Key
    await page.fill('#apiKey', ADMIN_API_KEY);

    // 点击登录
    await page.click('button[type="submit"]');

    // 预期：跳转到 Dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

    // 验证 localStorage 中有 token
    const token = await page.evaluate(() => localStorage.getItem('ai-feishu-admin-auth'));
    expect(token).toBeTruthy();
    console.log('✅ AUTH-001 通过：登录成功，跳转到 Dashboard');
  });

  test('AUTH-002: 使用错误 API Key 登录', async ({ page }) => {
    // 输入错误的 API Key
    await page.fill('#apiKey', 'wrong-api-key');

    // 点击登录
    await page.click('button[type="submit"]');

    // 等待错误提示出现
    await expect(page.locator('p.text-red-500')).toBeVisible({ timeout: 5000 });

    // 验证错误提示内容
    const errorText = await page.locator('p.text-red-500').textContent();
    expect(errorText).toContain('Invalid API key');

    // 验证仍在登录页
    await expect(page).toHaveURL(/login/);

    console.log('✅ AUTH-002 通过：错误 API Key 被正确拒绝');
  });

  test('AUTH-003: 登录后刷新页面 - 关键路径', async ({ page }) => {
    // 登录
    await page.fill('#apiKey', ADMIN_API_KEY);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    console.log('  登录成功，当前 URL:', page.url());

    // 刷新页面
    await page.reload();

    // 等待页面稳定（React hydration 完成）
    await page.waitForLoadState('networkidle');

    // 预期：保持在 Dashboard，不跳转到登录页
    const currentUrl = page.url();
    console.log('  刷新后 URL:', currentUrl);

    // 检查是否仍在 Dashboard
    if (currentUrl.includes('dashboard')) {
      console.log('✅ AUTH-003 通过：刷新后保持在 Dashboard');
    } else {
      console.log('❌ AUTH-003 失败：刷新后跳转到了', currentUrl);
      throw new Error(`AUTH-003 失败：刷新后应保持在 Dashboard，实际跳转到 ${currentUrl}`);
    }
  });

  test('AUTH-004: Token 过期后刷新', async ({ page }) => {
    // 登录
    await page.fill('#apiKey', ADMIN_API_KEY);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

    // 修改 localStorage 中的 expiresAt 为过去的时间
    await page.evaluate(() => {
      const stored = localStorage.getItem('ai-feishu-admin-auth');
      if (stored) {
        const data = JSON.parse(stored);
        data.state.expiresAt = Date.now() - 1000; // 设置为过去的时间
        localStorage.setItem('ai-feishu-admin-auth', JSON.stringify(data));
      }
    });

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 预期：跳转到登录页
    const currentUrl = page.url();
    console.log('  Token 过期后刷新 URL:', currentUrl);

    if (currentUrl.includes('login')) {
      console.log('✅ AUTH-004 通过：Token 过期后正确跳转到登录页');
    } else {
      console.log('❌ AUTH-004 失败：Token 过期后应跳转到登录页');
      throw new Error(`AUTH-004 失败：Token 过期后应跳转到登录页，实际跳转到 ${currentUrl}`);
    }
  });

  test('AUTH-005: 未登录直接访问 Dashboard', async ({ page }) => {
    // 直接访问 Dashboard
    await page.goto(`${ADMIN_URL}/dashboard`);

    // 等待足够长时间让 hydration 完成并重定向
    await page.waitForURL(/login/, { timeout: 10000 });

    const currentUrl = page.url();
    console.log('  未登录访问 Dashboard 后 URL:', currentUrl);

    if (currentUrl.includes('login')) {
      console.log('✅ AUTH-005 通过：未登录正确跳转到登录页');
    } else {
      console.log('❌ AUTH-005 失败：未登录时应跳转到登录页');
      throw new Error(`AUTH-005 失败：未登录应跳转到登录页，实际跳转到 ${currentUrl}`);
    }
  });

  test('AUTH-006: 登出功能', async ({ page }) => {
    // 登录
    await page.fill('#apiKey', ADMIN_API_KEY);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

    // 点击登出（查找包含"登出"或"Logout"或"Sign out"的按钮）
    const logoutButton = page.locator('button:has-text("登出"), button:has-text("Logout"), button:has-text("Sign out")');
    await logoutButton.click();

    // 等待跳转到登录页
    await page.waitForURL(/login/, { timeout: 5000 });

    // 验证 localStorage 已清除
    const token = await page.evaluate(() => localStorage.getItem('ai-feishu-admin-auth'));
    console.log('  登出后 localStorage:', token);

    if (!token || JSON.parse(token).state.token === null) {
      console.log('✅ AUTH-006 通过：登出功能正常');
    } else {
      console.log('❌ AUTH-006 失败：登出后 token 未清除');
      throw new Error('AUTH-006 失败：登出后 token 未清除');
    }
  });
});

test.describe('Admin Token 验证机制 (API 测试)', () => {
  test('AUTH-101: 服务端验证有效 Token', async ({ request }) => {
    // 先登录获取 token
    const loginResponse = await request.post('http://localhost:3000/api/admin/login', {
      data: { apiKey: ADMIN_API_KEY }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData.success).toBe(true);
    expect(loginData.token).toBeTruthy();

    const token = loginData.token;
    console.log('  获取到 Token:', token.substring(0, 20) + '...');

    // 使用 token 调用 /api/admin/models
    const modelsResponse = await request.get('http://localhost:3000/api/admin/models', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(modelsResponse.ok()).toBeTruthy();
    console.log('✅ AUTH-101 通过：有效 Token 可以正常调用 API');
  });

  test('AUTH-102: 使用过期 Token 请求', async ({ request }) => {
    // 创建一个过期的 token (expiresAt = 过去的时间)
    const expiredTimestamp = (Date.now() - 10000).toString(36); // 10秒前
    const randomPart = 'expiredtoken12345';
    const expiredToken = `${expiredTimestamp}:${randomPart}`;

    // 使用过期 token 调用 API
    const response = await request.get('http://localhost:3000/api/admin/models', {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });

    expect(response.status()).toBe(401);
    console.log('✅ AUTH-102 通过：过期 Token 被正确拒绝');
  });

  test('AUTH-103: 使用格式错误的 Token', async ({ request }) => {
    // 使用格式错误的 token
    const response = await request.get('http://localhost:3000/api/admin/models', {
      headers: {
        'Authorization': 'Bearer invalid-token-format'
      }
    });

    expect(response.status()).toBe(401);
    console.log('✅ AUTH-103 通过：格式错误的 Token 被正确拒绝');
  });

  test('AUTH-104: 使用 X-Admin-API-Key header', async ({ request }) => {
    // 直接使用 API Key 作为 header
    const response = await request.get('http://localhost:3000/api/admin/models', {
      headers: {
        'X-Admin-API-Key': ADMIN_API_KEY
      }
    });

    expect(response.ok()).toBeTruthy();
    console.log('✅ AUTH-104 通过：X-Admin-API-Key header 验证通过');
  });
});
