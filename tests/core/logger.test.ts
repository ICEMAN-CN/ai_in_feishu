import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalEnv = process.env;

describe('logger', () => {
  let consoleMock: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    consoleMock = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleMock.log.mockRestore();
    consoleMock.warn.mockRestore();
    consoleMock.error.mockRestore();
    process.env = originalEnv;
  });

  it('1. info() logs when level >= INFO', async () => {
    const { logger } = await import('@/core/logger');
    logger.info('testModule', 'info message');
    expect(consoleMock.log).toHaveBeenCalledTimes(1);
    const [firstArg] = consoleMock.log.mock.calls[0];
    expect(firstArg).toMatch(/^\[INFO\]/);
    expect(firstArg).toContain('[testModule]');
    expect(firstArg).toContain('info message');
  });

  it('2. debug() does NOT log when LOG_LEVEL=INFO', async () => {
    process.env.LOG_LEVEL = 'INFO';
    const { logger } = await import('@/core/logger');
    logger.debug('testModule', 'debug message');
    expect(consoleMock.log).not.toHaveBeenCalled();
  });

  it('3. warn() logs WARN and above', async () => {
    const { logger } = await import('@/core/logger');
    logger.warn('testModule', 'warn message');
    expect(consoleMock.warn).toHaveBeenCalledTimes(1);
    const [firstArg] = consoleMock.warn.mock.calls[0];
    expect(firstArg).toMatch(/^\[WARN\]/);
    expect(firstArg).toContain('[testModule]');
    expect(firstArg).toContain('warn message');
  });

  it('4. error() logs only ERROR', async () => {
    const { logger } = await import('@/core/logger');
    logger.error('testModule', 'error message');
    expect(consoleMock.error).toHaveBeenCalledTimes(1);
    expect(consoleMock.warn).not.toHaveBeenCalled();
    expect(consoleMock.log).not.toHaveBeenCalled();
    const [firstArg] = consoleMock.error.mock.calls[0];
    expect(firstArg).toMatch(/^\[ERROR\]/);
  });

  it('5. Module tag appears in output', async () => {
    const { logger } = await import('@/core/logger');
    logger.info('MyModule', 'test message');
    expect(consoleMock.log).toHaveBeenCalledTimes(1);
    const [firstArg] = consoleMock.log.mock.calls[0];
    expect(firstArg).toContain('[MyModule]');
  });

  it('6. LOG_LEVEL env var is respected', async () => {
    process.env.LOG_LEVEL = 'ERROR';
    const { logger } = await import('@/core/logger');
    logger.error('testModule', 'error message');
    logger.info('testModule', 'info should not log');
    expect(consoleMock.error).toHaveBeenCalled();
    expect(consoleMock.log).not.toHaveBeenCalled();
  });

  it('7. Multiple arguments are passed through', async () => {
    const { logger } = await import('@/core/logger');
    logger.info('testModule', 'message', { key: 'value' }, 123, 'extra');
    expect(consoleMock.log).toHaveBeenCalledTimes(1);
    const args = consoleMock.log.mock.calls[0];
    expect(args[0]).toMatch(/^\[INFO\]/);
    expect(args[0]).toContain('message');
    expect(args[1]).toEqual({ key: 'value' });
    expect(args[2]).toBe(123);
    expect(args[3]).toBe('extra');
  });

  it('8. Format matches pattern: [LEVEL] [timestamp] [module] message', async () => {
    const { logger } = await import('@/core/logger');
    logger.info('testModule', 'test message');
    expect(consoleMock.log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[INFO\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[testModule\] test message$/)
    );
  });
});
