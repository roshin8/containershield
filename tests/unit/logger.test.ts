/**
 * Unit tests for logger utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Logger,
  createLogger,
  setLogLevel,
  getLogLevel,
  LogLevel,
  backgroundLogger,
  contentLogger,
  popupLogger,
} from '../../src/lib/logger';

describe('logger utilities', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    // Reset to DEBUG level for testing
    setLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LogLevel', () => {
    it('has correct ordering', () => {
      expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
      expect(LogLevel.ERROR).toBeLessThan(LogLevel.NONE);
    });
  });

  describe('setLogLevel / getLogLevel', () => {
    it('sets and gets the log level', () => {
      setLogLevel(LogLevel.WARN);
      expect(getLogLevel()).toBe(LogLevel.WARN);

      setLogLevel(LogLevel.ERROR);
      expect(getLogLevel()).toBe(LogLevel.ERROR);
    });
  });

  describe('createLogger', () => {
    it('creates a logger with the given component name', () => {
      const logger = createLogger('TestComponent');
      logger.info('test message');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestComponent]'),
        // No extra args for this test
      );
    });
  });

  describe('Logger', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger('Test');
    });

    describe('debug', () => {
      it('logs at DEBUG level', () => {
        setLogLevel(LogLevel.DEBUG);
        logger.debug('debug message');

        expect(consoleSpy.debug).toHaveBeenCalledWith(
          expect.stringContaining('debug message')
        );
      });

      it('does not log when level is higher', () => {
        setLogLevel(LogLevel.INFO);
        logger.debug('debug message');

        expect(consoleSpy.debug).not.toHaveBeenCalled();
      });
    });

    describe('info', () => {
      it('logs at INFO level', () => {
        setLogLevel(LogLevel.INFO);
        logger.info('info message');

        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringContaining('info message')
        );
      });

      it('does not log when level is higher', () => {
        setLogLevel(LogLevel.WARN);
        logger.info('info message');

        expect(consoleSpy.info).not.toHaveBeenCalled();
      });
    });

    describe('warn', () => {
      it('logs at WARN level', () => {
        setLogLevel(LogLevel.WARN);
        logger.warn('warn message');

        expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining('warn message')
        );
      });

      it('does not log when level is higher', () => {
        setLogLevel(LogLevel.ERROR);
        logger.warn('warn message');

        expect(consoleSpy.warn).not.toHaveBeenCalled();
      });
    });

    describe('error', () => {
      it('logs at ERROR level', () => {
        setLogLevel(LogLevel.ERROR);
        logger.error('error message');

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('error message')
        );
      });

      it('does not log when level is NONE', () => {
        setLogLevel(LogLevel.NONE);
        logger.error('error message');

        expect(consoleSpy.error).not.toHaveBeenCalled();
      });
    });

    describe('log', () => {
      it('logs at specified level', () => {
        logger.log(LogLevel.INFO, 'log message');

        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringContaining('log message')
        );
      });
    });

    describe('child', () => {
      it('creates a child logger with combined name', () => {
        const childLogger = logger.child('SubComponent');
        childLogger.info('child message');

        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringContaining('[Test:SubComponent]')
        );
      });
    });

    describe('with additional arguments', () => {
      it('passes additional arguments to console', () => {
        const extraData = { key: 'value' };
        logger.info('message with data', extraData);

        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringContaining('message with data'),
          extraData
        );
      });
    });
  });

  describe('pre-created loggers', () => {
    it('exports backgroundLogger', () => {
      expect(backgroundLogger).toBeInstanceOf(Logger);
    });

    it('exports contentLogger', () => {
      expect(contentLogger).toBeInstanceOf(Logger);
    });

    it('exports popupLogger', () => {
      expect(popupLogger).toBeInstanceOf(Logger);
    });
  });
});
