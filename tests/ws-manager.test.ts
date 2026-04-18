/**
 * WebSocket Manager Unit Tests
 *
 * Unit tests for FeishuWSManager class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Feishu SDK
vi.mock('@larksuiteoapi/node-sdk', () => {
  class MockWSClient {
    start = vi.fn();
    close = vi.fn();
  }

  class MockEventDispatcher {
    register = vi.fn();
  }

  class MockClient {
    // Mock client methods
  }

  return {
    WSClient: vi.fn(() => new MockWSClient()),
    EventDispatcher: vi.fn(() => new MockEventDispatcher()),
    Client: vi.fn(() => new MockClient()),
    LoggerLevel: {
      warn: 2,
      debug: 3,
    },
  };
});

import { FeishuWSManager, createFeishuWSManager } from '../src/core/ws-manager';

describe('FeishuWSManager', () => {
  let manager: FeishuWSManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new FeishuWSManager({
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
    });
  });

  afterEach(() => {
    manager.stop();
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(manager).toBeInstanceOf(FeishuWSManager);
    });

    it('should create instance with default logger level', () => {
      const manager2 = new FeishuWSManager({
        appId: 'test-id',
        appSecret: 'test-secret',
      });
      expect(manager2).toBeInstanceOf(FeishuWSManager);
    });
  });

  describe('isConnected()', () => {
    it('should return false initially', () => {
      expect(manager.isConnected()).toBe(false);
    });
  });

  describe('registerHandler()', () => {
    it('should register event handler before start', () => {
      const handler = vi.fn();
      expect(() => {
        manager.registerHandler('im.message.receive_v1', handler);
      }).not.toThrow();
    });

    it('should throw when registering after start', () => {
      manager.start();
      const handler = vi.fn();
      expect(() => {
        manager.registerHandler('im.message.receive_v1', handler);
      }).toThrow('Cannot register handler after start()');
    });
  });

  describe('start()', () => {
    it('should start WebSocket connection', () => {
      manager.start();
      expect(manager.isConnected()).toBe(true);
    });

    it('should not start twice', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      manager.start();
      manager.start(); // Second start should warn

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FeishuWS] Already started')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('stop()', () => {
    it('should stop without throwing even if not started', () => {
      expect(() => manager.stop()).not.toThrow();
    });

    it('should stop after start', () => {
      manager.start();
      manager.stop();
      expect(manager.isConnected()).toBe(false);
    });
  });

  describe('getClient()', () => {
    it('should throw before start', () => {
      expect(() => manager.getClient()).toThrow('Client not initialized');
    });

    it('should return client after start', () => {
      manager.start();
      expect(manager.getClient()).toBeDefined();
    });
  });
});

describe('createFeishuWSManager factory', () => {
  it('should create FeishuWSManager instance', () => {
    const wsManager = createFeishuWSManager({
      appId: 'test-id',
      appSecret: 'test-secret',
    });
    expect(wsManager).toBeInstanceOf(FeishuWSManager);
  });
});
