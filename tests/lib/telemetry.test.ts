import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordCall,
  getEntries,
  getCallCount,
  getCacheHits,
  resetTelemetry,
  setTelemetryEnabled,
  isTelemetryEnabled,
  classifyRole,
  printTelemetryReceipt,
  printReceipt,
  resetLog,
} from '../../src/lib/telemetry.js';
import type { TelemetryEntry } from '../../src/lib/telemetry.js';

const makeEntry = (overrides: Partial<TelemetryEntry> = {}): TelemetryEntry => ({
  endpoint: 'test-endpoint',
  method: 'EXEC',
  latency_ms: 100,
  status: 'SUCCESS',
  cache: 'MISS',
  role: 'Other',
  ...overrides,
});

describe('telemetry', () => {
  beforeEach(() => {
    resetTelemetry();
    setTelemetryEnabled(true);
  });

  describe('recordCall / getEntries / getCallCount', () => {
    it('should record and retrieve entries', () => {
      recordCall(makeEntry());
      expect(getEntries()).toHaveLength(1);
      expect(getCallCount()).toBe(1);
    });

    it('should return copies of entries (immutable)', () => {
      recordCall(makeEntry());
      const entries = getEntries();
      entries.push(makeEntry());
      expect(getEntries()).toHaveLength(1);
    });

    it('should accumulate multiple entries', () => {
      recordCall(makeEntry());
      recordCall(makeEntry());
      recordCall(makeEntry());
      expect(getCallCount()).toBe(3);
    });
  });

  describe('getCacheHits', () => {
    it('should count HIT entries only', () => {
      recordCall(makeEntry({ cache: 'HIT' }));
      recordCall(makeEntry({ cache: 'MISS' }));
      recordCall(makeEntry({ cache: 'HIT' }));
      recordCall(makeEntry({ cache: 'N/A' }));
      expect(getCacheHits()).toBe(2);
    });
  });

  describe('resetTelemetry', () => {
    it('should clear all entries', () => {
      recordCall(makeEntry());
      recordCall(makeEntry());
      resetTelemetry();
      expect(getCallCount()).toBe(0);
      expect(getEntries()).toHaveLength(0);
    });
  });

  describe('setTelemetryEnabled / isTelemetryEnabled', () => {
    it('should disable recording when disabled', () => {
      setTelemetryEnabled(false);
      expect(isTelemetryEnabled()).toBe(false);
      recordCall(makeEntry());
      expect(getCallCount()).toBe(0);
    });

    it('should re-enable recording', () => {
      setTelemetryEnabled(false);
      setTelemetryEnabled(true);
      expect(isTelemetryEnabled()).toBe(true);
      recordCall(makeEntry());
      expect(getCallCount()).toBe(1);
    });
  });

  describe('classifyRole', () => {
    it('should classify trace commands', () => {
      expect(classifyRole('profiler trace')).toBe('Traversal');
    });

    it('should classify counterparty commands', () => {
      expect(classifyRole('profiler counterparties')).toBe('Traversal');
    });

    it('should classify related-wallets', () => {
      expect(classifyRole('profiler related-wallets')).toBe('Discovery');
    });

    it('should classify compare commands', () => {
      expect(classifyRole('profiler compare')).toBe('Comparison');
    });

    it('should classify labels commands', () => {
      expect(classifyRole('profiler labels')).toBe('Enrichment');
    });

    it('should classify balance commands', () => {
      expect(classifyRole('profiler balance')).toBe('Enrichment');
    });

    it('should classify pnl-summary commands', () => {
      expect(classifyRole('profiler pnl-summary')).toBe('Enrichment');
    });

    it('should classify portfolio defi commands', () => {
      expect(classifyRole('portfolio defi')).toBe('Enrichment');
    });

    it('should classify web search commands', () => {
      expect(classifyRole('web search')).toBe('OSINT');
    });

    it('should classify smart-money commands', () => {
      expect(classifyRole('smart-money netflow')).toBe('SM Analysis');
    });

    it('should classify transaction commands', () => {
      expect(classifyRole('profiler transactions')).toBe('History');
    });

    it('should classify token commands', () => {
      expect(classifyRole('token info')).toBe('Token Data');
    });

    it('should classify wallet commands', () => {
      expect(classifyRole('wallet show')).toBe('Wallet Mgmt');
    });

    it('should classify account commands', () => {
      expect(classifyRole('account')).toBe('Account');
    });

    it('should classify schema commands', () => {
      expect(classifyRole('schema')).toBe('Dev Tools');
    });

    it('should return Other for unknown commands', () => {
      expect(classifyRole('unknown-cmd')).toBe('Other');
    });
  });

  describe('printTelemetryReceipt', () => {
    it('should print nothing when no entries', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      printTelemetryReceipt();
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should print receipt when entries exist', () => {
      recordCall(makeEntry({ endpoint: 'profiler trace', status: '200', cache: 'MISS', latency_ms: 200 }));
      recordCall(makeEntry({ endpoint: 'profiler labels', status: 'SUCCESS', cache: 'HIT', latency_ms: 5 }));
      recordCall(makeEntry({ endpoint: 'long-endpoint-name-that-exceeds-forty-characters-limit', status: 'ERROR', latency_ms: 600 }));

      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      printTelemetryReceipt();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('aliases', () => {
    it('printReceipt should be the same as printTelemetryReceipt', () => {
      expect(printReceipt).toBe(printTelemetryReceipt);
    });

    it('resetLog should be the same as resetTelemetry', () => {
      expect(resetLog).toBe(resetTelemetry);
    });
  });
});
