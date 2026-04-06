import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// We need to mock the cache dir before importing
const TEST_CACHE_DIR = join(tmpdir(), '.redstring-test-cache-' + Date.now());

// Mock homedir so cache goes to temp
vi.mock('node:os', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    homedir: () => join(tmpdir(), '.redstring-test-home-' + process.pid),
  };
});

import { getCacheKey, getTTL, getCached, setCache, clearCache, getCacheStats, getCacheDir } from '../../src/lib/disk-cache.js';

describe('disk-cache', () => {
  beforeEach(() => {
    // Ensure the cache dir is clean before each test
    const dir = getCacheDir();
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    const dir = getCacheDir();
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('getCacheKey', () => {
    it('should generate deterministic SHA256 keys', () => {
      const key1 = getCacheKey('profiler trace', ['--address', '0x123']);
      const key2 = getCacheKey('profiler trace', ['--address', '0x123']);
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different keys for different commands', () => {
      const key1 = getCacheKey('profiler trace', ['--address', '0x123']);
      const key2 = getCacheKey('profiler balance', ['--address', '0x123']);
      expect(key1).not.toBe(key2);
    });

    it('should produce different keys for different args', () => {
      const key1 = getCacheKey('profiler trace', ['--address', '0x111']);
      const key2 = getCacheKey('profiler trace', ['--address', '0x222']);
      expect(key1).not.toBe(key2);
    });
  });

  describe('getTTL', () => {
    it('should return 7-day TTL for labels', () => {
      expect(getTTL('profiler labels')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should return 1-hour TTL for balance', () => {
      expect(getTTL('profiler balance')).toBe(1 * 60 * 60 * 1000);
    });

    it('should return 24-hour TTL for trace', () => {
      expect(getTTL('profiler trace')).toBe(24 * 60 * 60 * 1000);
    });

    it('should return 6-hour TTL for pnl-summary', () => {
      expect(getTTL('profiler pnl-summary')).toBe(6 * 60 * 60 * 1000);
    });

    it('should return 7-day TTL for web search', () => {
      expect(getTTL('web search')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should return default 6-hour TTL for unknown commands', () => {
      expect(getTTL('unknown-command')).toBe(6 * 60 * 60 * 1000);
    });
  });

  describe('getCached / setCache', () => {
    it('should return null for cache miss', () => {
      const result = getCached('profiler trace', ['--address', '0x999']);
      expect(result).toBeNull();
    });

    it('should cache and retrieve data', () => {
      const data = { total_usd: 1000 };
      setCache('profiler balance', ['--address', '0x123'], data);
      const result = getCached('profiler balance', ['--address', '0x123']);
      expect(result).toEqual(data);
    });

    it('should return null for expired entries', () => {
      const key = getCacheKey('profiler balance', ['--address', '0xexp']);
      const dir = getCacheDir();
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const filePath = join(dir, `${key}.json`);
      
      // Write a cache entry that is expired (2 hours old, TTL is 1 hour)
      const entry = {
        data: { total_usd: 500 },
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        command: 'profiler balance --address 0xexp',
      };
      writeFileSync(filePath, JSON.stringify(entry));
      
      const result = getCached('profiler balance', ['--address', '0xexp']);
      expect(result).toBeNull();
    });

    it('should return null for corrupted cache files', () => {
      const key = getCacheKey('profiler trace', ['--address', '0xcorrupt']);
      const dir = getCacheDir();
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const filePath = join(dir, `${key}.json`);
      writeFileSync(filePath, 'not valid json{{{');
      
      const result = getCached('profiler trace', ['--address', '0xcorrupt']);
      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached entries', () => {
      setCache('cmd1', ['a'], { x: 1 });
      setCache('cmd2', ['b'], { x: 2 });
      
      const result = clearCache();
      expect(result.cleared).toBe(2);
      
      expect(getCached('cmd1', ['a'])).toBeNull();
      expect(getCached('cmd2', ['b'])).toBeNull();
    });

    it('should return 0 when cache is empty', () => {
      const result = clearCache();
      expect(result.cleared).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return zero stats for empty cache', () => {
      const stats = getCacheStats();
      expect(stats.entries).toBe(0);
      expect(stats.size_bytes).toBe(0);
      expect(stats.oldest_ms).toBe(0);
      expect(stats.newest_ms).toBe(0);
      expect(stats.dir).toBeDefined();
    });

    it('should return accurate stats for populated cache', () => {
      setCache('cmd1', ['a'], { data: 'hello' });
      setCache('cmd2', ['b'], { data: 'world' });
      
      const stats = getCacheStats();
      expect(stats.entries).toBe(2);
      expect(stats.size_bytes).toBeGreaterThan(0);
      expect(stats.oldest_ms).toBeGreaterThan(0);
      expect(stats.newest_ms).toBeGreaterThan(0);
      expect(stats.newest_ms).toBeGreaterThanOrEqual(stats.oldest_ms);
    });
  });

  describe('getCacheDir', () => {
    it('should return a string path', () => {
      expect(typeof getCacheDir()).toBe('string');
      expect(getCacheDir()).toContain('.redstring');
    });
  });
});
