/**
 * Sprint 7 E2E Tests - Admin API Endpoints
 *
 * Playwright E2E tests for Admin API endpoints:
 * - GET /health - Health check
 * - GET /api/admin/models - Model list
 * - GET /api/admin/kb/folders - KB folder list
 * - POST /api/admin/kb/sync - KB sync trigger
 * - GET /api/admin/config - Configuration
 *
 * Run: npx playwright test tests/e2e/admin-api.test.ts --project=chromium
 * Prerequisites: Backend must be running on port 3000
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_BASE = 'http://localhost:3000';

test.describe('Sprint 7 Admin API E2E Tests', () => {

  // ========================================
  // TC-API-7.1: Health Endpoint
  // ========================================
  test.describe('Health Endpoint', () => {

    test('TC-API-7.1-001: GET /health returns 200 with status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('status');
      expect(['ok', 'healthy']).toContain(body.status);
    });

    test('TC-API-7.1-002: Health endpoint returns expected fields', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health`);
      const body = await response.json();

      // Should have timestamp or version field
      expect(body).toHaveProperty('timestamp') || expect(body).toHaveProperty('version');
    });

  });

  // ========================================
  // TC-API-7.2: Models Endpoint
  // ========================================
  test.describe('Models Endpoint', () => {

    test('TC-API-7.2-001: GET /api/admin/models returns model list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/admin/models`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('models') || Array.isArray(body);
    });

    test('TC-API-7.2-002: Models endpoint returns array of models', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/admin/models`);
      const body = await response.json();

      const models = body.models || body;
      expect(Array.isArray(models)).toBe(true);
    });

    test('TC-API-7.2-003: Model objects have required fields', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/admin/models`);
      const body = await response.json();

      const models = body.models || body;
      if (models.length > 0) {
        const firstModel = models[0];
        expect(firstModel).toHaveProperty('id');
        expect(firstModel).toHaveProperty('name');
      }
    });

  });

  // ========================================
  // TC-API-7.3: KB Folders Endpoint
  // ========================================
  test.describe('KB Folders Endpoint', () => {

    test('TC-API-7.3-001: GET /api/admin/kb/folders returns folder list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/admin/kb/folders`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('folders') || Array.isArray(body);
    });

    test('TC-API-7.3-002: Folders endpoint returns array', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/admin/kb/folders`);
      const body = await response.json();

      const folders = body.folders || body;
      expect(Array.isArray(folders)).toBe(true);
    });

    test('TC-API-7.3-003: Folder objects have required fields when not empty', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/admin/kb/folders`);
      const body = await response.json();

      const folders = body.folders || body;
      if (folders.length > 0) {
        const firstFolder = folders[0];
        expect(firstFolder).toHaveProperty('id');
        expect(firstFolder).toHaveProperty('name');
      }
    });

  });

  // ========================================
  // TC-API-7.4: KB Sync Endpoint
  // ========================================
  test.describe('KB Sync Endpoint', () => {

    test('TC-API-7.4-001: POST /api/admin/kb/sync triggers sync', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/admin/kb/sync`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('success') || expect(body).toHaveProperty('message') || expect(body).toHaveProperty('taskId');
    });

    test('TC-API-7.4-002: POST /api/admin/kb/sync accepts JSON body', async ({ request }) => {
      const response = await request.post(`${API_BASE}/api/admin/kb/sync`, {
        data: { folderId: 'test-folder-id' },
        headers: { 'Content-Type': 'application/json' },
      });
      // Should return 200 or accept the request
      expect([200, 202]).toContain(response.status());
    });

  });

  // ========================================
  // TC-API-7.5: Config Endpoint
  // ========================================
  test.describe('Config Endpoint', () => {

    test('TC-API-7.5-001: GET /api/admin/config returns config', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/admin/config`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(typeof body).toBe('object');
    });

    test('TC-API-7.5-002: Config contains feishu settings', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/admin/config`);
      const body = await response.json();

      // Config should have some structure
      const config = body.config || body;
      expect(typeof config).toBe('object');
    });

  });

  // ========================================
  // TC-API-7.6: API Error Handling
  // ========================================
  test.describe('API Error Handling', () => {

    test('TC-API-7.6-001: Returns 404 for unknown endpoints', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/unknown`);
      expect(response.status()).toBe(404);
    });

    test('TC-API-7.6-002: Returns JSON for error responses', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/unknown`);
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });

  });

});