/**
 * Sprint 7 E2E Tests - Admin Console Pages
 *
 * Playwright E2E tests for Admin console pages:
 * - Dashboard
 * - Settings
 * - Models
 * - KnowledgeBase
 *
 * Run: npx playwright test tests/e2e/admin-pages.test.ts
 * Prerequisites: Backend must be running on port 3000, Frontend on port 5173
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE = 'http://localhost:3000';

test.describe('Sprint 7 Admin Console E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  // ========================================
  // TC-7.1: Dashboard Page
  // ========================================
  test.describe('Dashboard Page', () => {

    test('TC-7.1-001: should navigate to Dashboard', async ({ page }) => {
      await page.click('text=Dashboard');
      await expect(page.locator('h1')).toContainText('系统状态');
    });

    test('TC-7.1-002: should display status cards', async ({ page }) => {
      await page.click('text=Dashboard');
      await expect(page.locator('text=WebSocket')).toBeVisible();
      await expect(page.locator('text=MCP')).toBeVisible();
      await expect(page.locator('text=向量库')).toBeVisible();
      await expect(page.locator('text=LLM')).toBeVisible();
    });

    test('TC-7.1-003: should display KB stats', async ({ page }) => {
      await page.click('text=Dashboard');
      await expect(page.locator('text=知识库统计')).toBeVisible();
      await expect(page.locator('text=文档总数')).toBeVisible();
      await expect(page.locator('text=Chunk数量')).toBeVisible();
    });

    test('TC-7.1-004: should display sync records section', async ({ page }) => {
      await page.click('text=Dashboard');
      await expect(page.locator('text=最近同步记录')).toBeVisible();
    });

  });

  // ========================================
  // TC-7.2: Settings Page
  // ========================================
  test.describe('Settings Page', () => {

    test('TC-7.2-001: should navigate to Settings', async ({ page }) => {
      await page.click('text=Settings');
      await expect(page.locator('h1')).toContainText('设置');
    });

    test('TC-7.2-002: should display Feishu config section', async ({ page }) => {
      await page.click('text=Settings');
      await expect(page.locator('text=飞书配置')).toBeVisible();
      await expect(page.locator('input[placeholder*="cli_"]')).toBeVisible();
    });

    test('TC-7.2-003: should display MCP config section', async ({ page }) => {
      await page.click('text=Settings');
      await expect(page.locator('text=MCP配置')).toBeVisible();
      await expect(page.locator('text=MCP Server URL')).toBeVisible();
    });

    test('TC-7.2-004: should have password input for App Secret', async ({ page }) => {
      await page.click('text=Settings');
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible();
    });

  });

  // ========================================
  // TC-7.3: Models Page
  // ========================================
  test.describe('Models Page', () => {

    test('TC-7.3-001: should navigate to Models', async ({ page }) => {
      await page.click('text=Models');
      await expect(page.locator('h1')).toContainText('模型管理');
    });

    test('TC-7.3-002: should display Add Model button', async ({ page }) => {
      await page.click('text=Models');
      await expect(page.locator('button:has-text("添加模型")')).toBeVisible();
    });

    test('TC-7.3-003: should show add model form when clicking button', async ({ page }) => {
      await page.click('text=Models');
      await page.click('button:has-text("添加模型")');
      await expect(page.locator('text=添加新模型')).toBeVisible();
    });

    test('TC-7.3-004: should have model name input in form', async ({ page }) => {
      await page.click('text=Models');
      await page.click('button:has-text("添加模型")');
      await expect(page.locator('input[placeholder="模型名称"]')).toBeVisible();
    });

    test('TC-7.3-005: should have provider dropdown in form', async ({ page }) => {
      await page.click('text=Models');
      await page.click('button:has-text("添加模型")');
      await expect(page.locator('select')).toBeVisible();
    });

    test('TC-7.3-006: should disable submit when fields are empty', async ({ page }) => {
      await page.click('text=Models');
      await page.click('button:has-text("添加模型")');
      const submitButton = page.locator('button:has-text("创建")');
      await expect(submitButton).toBeDisabled();
    });

    test('TC-7.3-007: should enable submit when required fields are filled', async ({ page }) => {
      await page.click('text=Models');
      await page.click('button:has-text("添加模型")');
      await page.fill('input[placeholder="模型名称"]', 'Test Model');
      await page.fill('input[placeholder="API Key"]', 'sk-test-key');
      await page.fill('input[placeholder="模型ID"]', 'gpt-4o');
      const submitButton = page.locator('button:has-text("创建")');
      await expect(submitButton).not.toBeDisabled();
    });

  });

  // ========================================
  // TC-7.4: KnowledgeBase Page
  // ========================================
  test.describe('KnowledgeBase Page', () => {

    test('TC-7.4-001: should navigate to KnowledgeBase', async ({ page }) => {
      await page.click('text=Knowledge Base');
      await expect(page.locator('h1')).toContainText('知识库管理');
    });

    test('TC-7.4-002: should display KB stats cards', async ({ page }) => {
      await page.click('text=Knowledge Base');
      await expect(page.locator('text=文档总数')).toBeVisible();
      await expect(page.locator('text=Chunk数量')).toBeVisible();
      await expect(page.locator('button:has-text("全量同步")')).toBeVisible();
    });

    test('TC-7.4-003: should display add folder section', async ({ page }) => {
      await page.click('text=Knowledge Base');
      await expect(page.locator('text=添加知识库文件夹')).toBeVisible();
      await expect(page.locator('input[placeholder="文件夹名称"]')).toBeVisible();
      await expect(page.locator('input[placeholder*="飞书文件夹URL"]')).toBeVisible();
    });

    test('TC-7.4-004: should disable add button when fields empty', async ({ page }) => {
      await page.click('text=Knowledge Base');
      const addButton = page.locator('button:has-text("添加文件夹")');
      await expect(addButton).toBeDisabled();
    });

    test('TC-7.4-005: should enable add button when both fields filled', async ({ page }) => {
      await page.click('text=Knowledge Base');
      await page.fill('input[placeholder="文件夹名称"]', 'Test Folder');
      await page.fill('input[placeholder*="飞书文件夹URL"]', 'https://feishu.cn/folder/test');
      const addButton = page.locator('button:has-text("添加文件夹")');
      await expect(addButton).not.toBeDisabled();
    });

    test('TC-7.4-006: should display empty state when no folders', async ({ page }) => {
      await page.click('text=Knowledge Base');
      const emptyState = page.locator('text=暂无知识库文件夹');
      await expect(emptyState).toBeVisible();
    });

  });

  // ========================================
  // TC-7.5: Navigation
  // ========================================
  test.describe('Navigation', () => {

    test('TC-7.5-001: should highlight active nav item', async ({ page }) => {
      await page.click('text=Models');
      const modelsNavItem = page.locator('nav a:has-text("Models")');
      await expect(modelsNavItem).toHaveClass(/bg-blue-50/);
    });

    test('TC-7.5-002: should navigate between all pages', async ({ page }) => {
      await page.click('text=Dashboard');
      await expect(page.locator('h1')).toContainText('系统状态');

      await page.click('text=Models');
      await expect(page.locator('h1')).toContainText('模型管理');

      await page.click('text=Knowledge Base');
      await expect(page.locator('h1')).toContainText('知识库管理');

      await page.click('text=Settings');
      await expect(page.locator('h1')).toContainText('设置');
    });

  });

  // ========================================
  // TC-7.6: Responsive Layout
  // ========================================
  test.describe('Responsive Layout', () => {

    test('TC-7.6-001: should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('text=Dashboard');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.flex.flex-col')).toBeVisible();
    });

    test('TC-7.6-002: should display correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.click('text=Dashboard');
      await expect(page.locator('h1')).toBeVisible();
    });

    test('TC-7.6-003: KnowledgeBase stats should stack on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('text=Knowledge Base');
      const statsGrid = page.locator('.grid.grid-cols-1');
      await expect(statsGrid.first()).toBeVisible();
    });

  });

  // ========================================
  // TC-7.7: API Connectivity
  // ========================================
  test.describe('API Connectivity', () => {

    test('TC-7.7-001: should load dashboard data from API', async ({ page }) => {
      await page.click('text=Dashboard');
      await page.waitForResponse(`${API_BASE}/health`);
      await expect(page.locator('text=系统状态')).toBeVisible();
    });

    test('TC-7.7-002: should load models from API', async ({ page }) => {
      await page.click('text=Models');
      await page.waitForResponse(`${API_BASE}/api/admin/models`);
      await expect(page.locator('h1')).toContainText('模型管理');
    });

    test('TC-7.7-003: should load KB folders from API', async ({ page }) => {
      await page.click('text=Knowledge Base');
      await page.waitForResponse(`${API_BASE}/api/admin/kb/folders`);
      await expect(page.locator('h1')).toContainText('知识库管理');
    });

  });

});
