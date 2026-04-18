import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeishuWSManager } from '../../src/core/ws-manager';

let shouldWSClientThrow = false;

const mocks = vi.hoisted(() => {
  const mockWSClientInstance = {
    start: vi.fn(),
    close: vi.fn(),
  };

  const mockClientInstance = {
    im: {
      v1: {
        message: {
          create: vi.fn(),
        },
      },
    },
  };

  const mockEventDispatcherInstance = {
    register: vi.fn(),
  };

  return {
    mockWSClientInstance,
    mockClientInstance,
    mockEventDispatcherInstance,
  };
});

vi.mock('@larksuiteoapi/node-sdk', () => {
  return {
    WSClient: vi.fn(() => {
      if (shouldWSClientThrow) {
        throw new Error('Connection failed');
      }
      return mocks.mockWSClientInstance;
    }),
    Client: vi.fn(() => mocks.mockClientInstance),
    EventDispatcher: vi.fn(() => mocks.mockEventDispatcherInstance),
    LoggerLevel: {
      warn: 'warn',
      info: 'info',
      error: 'error',
    },
  };
});

describe('EXC-001: WebSocket Disconnect & Reconnect', () => {
  const TEST_CONFIG = {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    shouldWSClientThrow = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Scenarios', () => {
    it('should throw error when registering handler after start()', () => {
      const manager = new FeishuWSManager(TEST_CONFIG);
      manager.start();

      expect(() => {
        manager.registerHandler('im.message.receive_v1', vi.fn());
      }).toThrow('[FeishuWS] Cannot register handler after start()');
    });

    it('should throw error when start() fails', () => {
      shouldWSClientThrow = true;

      const manager = new FeishuWSManager(TEST_CONFIG);

      expect(() => {
        manager.start();
      }).toThrow('[FeishuWS] Failed to start: Error: Connection failed');
    });

    it('should throw error when getClient() called before start()', () => {
      const manager = new FeishuWSManager(TEST_CONFIG);

      expect(() => {
        manager.getClient();
      }).toThrow('[FeishuWS] Client not initialized. Call start() first.');
    });
  });

  describe('Reconnection Behavior', () => {
    it('should allow re-registering handlers after stop()', () => {
      const manager = new FeishuWSManager(TEST_CONFIG);
      const handler = vi.fn();

      manager.registerHandler('im.message.receive_v1', handler);
      manager.start();
      manager.stop();

      expect(() => {
        manager.registerHandler('im.message.receive_v1', vi.fn());
      }).not.toThrow();
    });

    it('should allow re-starting after stop()', () => {
      const manager = new FeishuWSManager(TEST_CONFIG);

      manager.start();
      manager.stop();

      expect(() => {
        manager.start();
      }).not.toThrow();
    });

    it('should report disconnected after stop()', () => {
      const manager = new FeishuWSManager(TEST_CONFIG);

      manager.start();
      expect(manager.isConnected()).toBe(true);

      manager.stop();
      expect(manager.isConnected()).toBe(false);
    });

    it('should report disconnected before start()', () => {
      const manager = new FeishuWSManager(TEST_CONFIG);

      expect(manager.isConnected()).toBe(false);
    });
  });

  describe('WSClient Integration', () => {
    it('should call wsClient.close() on stop()', () => {
      const manager = new FeishuWSManager(TEST_CONFIG);

      manager.start();
      manager.stop();

      expect(mocks.mockWSClientInstance.close).toHaveBeenCalled();
    });

    it('should start with registered handlers', () => {
      const handler = vi.fn();
      const manager = new FeishuWSManager(TEST_CONFIG);

      manager.registerHandler('im.message.receive_v1', handler);
      manager.start();

      expect(mocks.mockEventDispatcherInstance.register).toHaveBeenCalledWith({
        'im.message.receive_v1': handler,
      });

      expect(mocks.mockWSClientInstance.start).toHaveBeenCalledWith({
        eventDispatcher: mocks.mockEventDispatcherInstance,
      });
    });
  });
});
