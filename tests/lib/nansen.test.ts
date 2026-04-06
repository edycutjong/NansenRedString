import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetTelemetry } from '../../src/lib/telemetry.js';

vi.mock('node:child_process', () => ({ execFile: vi.fn() }));
vi.mock('../../src/lib/disk-cache.js', () => ({ getCached: vi.fn().mockReturnValue(null), setCache: vi.fn() }));

let mockMode = true;
vi.mock('../../src/lib/mock.js', () => ({
  get IS_MOCK() { return mockMode; },
  getMockData: vi.fn().mockReturnValue({ test: true }),
}));

import {
  execNansen, getApiCallCount, resetApiCallCount,
  fetchProfilerTrace, fetchCounterparties, fetchRelatedWallets, fetchCompare,
  fetchProfilerLabels, fetchProfilerBalance, fetchPnlSummary, fetchTransactions,
  fetchPortfolioDefi, fetchSmartMoneyNetflow, fetchTokenInfo, fetchWhoBoughtSold,
  fetchWebSearch, checkNansenInstalled, fetchAccountStatus, fetchWalletShow, fetchSchema,
} from '../../src/lib/nansen.js';
import { getMockData } from '../../src/lib/mock.js';
import { getCached } from '../../src/lib/disk-cache.js';
import { execFile } from 'node:child_process';

const mockGetCached = getCached as ReturnType<typeof vi.fn>;
const mockExecFile = execFile as unknown as ReturnType<typeof vi.fn>;
const mockGetMockData = getMockData as ReturnType<typeof vi.fn>;

describe('nansen', () => {
  beforeEach(() => {
    vi.clearAllMocks(); resetApiCallCount(); resetTelemetry();
    mockMode = true; mockGetMockData.mockReturnValue({ test: true }); mockGetCached.mockReturnValue(null);
  });

  it('should track API call count', async () => {
    expect(getApiCallCount()).toBe(0);
    await execNansen('test'); expect(getApiCallCount()).toBe(1);
    resetApiCallCount(); expect(getApiCallCount()).toBe(0);
  });

  it('mock mode returns data', async () => {
    const r = await execNansen('profiler trace', ['--address', '0x1']);
    expect(r.success).toBe(true); expect(r.data).toEqual({ test: true });
  });

  it('mock mode returns error for null', async () => {
    mockGetMockData.mockReturnValue(null);
    const r = await execNansen('unknown'); expect(r.success).toBe(false);
  });

  it('cache hit returns cached data', async () => {
    mockMode = false; mockGetCached.mockReturnValue({ cached: true });
    const r = await execNansen('profiler labels', ['--address', '0x1']);
    expect(r.data).toEqual({ cached: true });
  });

  it('noCache bypasses cache', async () => {
    mockMode = false; mockGetCached.mockReturnValue({ cached: true });
    mockExecFile.mockImplementation((_c: any, _a: any, _o: any, cb: any) => cb(null, '{"success":true,"data":{"live":true}}', ''));
    const r = await execNansen('cmd', [], { noCache: true });
    expect(r.data).toEqual({ live: true });
  });

  it('parses JSON response', async () => {
    mockMode = false;
    mockExecFile.mockImplementation((_c: any, _a: any, _o: any, cb: any) => cb(null, '{"success":true,"data":{"b":1}}', ''));
    const r = await execNansen('cmd', []); expect(r.data).toEqual({ b: 1 });
  });

  it('unwraps nested data', async () => {
    mockMode = false;
    mockExecFile.mockImplementation((_c: any, _a: any, _o: any, cb: any) => cb(null, '{"success":true,"data":{"data":{"inner":1}}}', ''));
    const r = await execNansen('cmd', []); expect(r.data).toEqual({ inner: 1 });
  });

  it('handles JSON error in stderr', async () => {
    mockMode = false;
    mockExecFile.mockImplementation((_c: any, _a: any, _o: any, cb: any) => cb(new Error('e'), '', '{"error":"rate limit","code":"RL"}'));
    const r = await execNansen('cmd', []); expect(r.error).toBe('rate limit'); expect(r.code).toBe('RL');
  });

  it('handles plain error text', async () => {
    mockMode = false;
    mockExecFile.mockImplementation((_c: any, _a: any, _o: any, cb: any) => cb(new Error('e'), '', 'plain error'));
    const r = await execNansen('cmd', []); expect(r.code).toBe('EXEC_ERROR');
  });

  it('handles non-JSON stdout', async () => {
    mockMode = false;
    mockExecFile.mockImplementation((_c: any, _a: any, _o: any, cb: any) => cb(null, 'not json', ''));
    const r = await execNansen('cmd', []); expect(r.code).toBe('PARSE_ERROR');
  });

  it('uses error.message fallback', async () => {
    mockMode = false;
    mockExecFile.mockImplementation((_c: any, _a: any, _o: any, cb: any) => cb(new Error('msg'), '', ''));
    const r = await execNansen('cmd', []); expect(r.error).toContain('msg');
  });

  it('debug logging for errors', async () => {
    mockMode = false; process.env.NANSEN_DEBUG = 'true';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExecFile.mockImplementation((_c: any, _a: any, _o: any, cb: any) => cb(new Error('e'), '', 'err'));
    await execNansen('cmd', []); expect(spy).toHaveBeenCalled();
    spy.mockRestore(); delete process.env.NANSEN_DEBUG;
  });

  it('debug logging for parse errors', async () => {
    mockMode = false; process.env.NANSEN_DEBUG = 'true';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExecFile.mockImplementation((_c: any, _a: any, _o: any, cb: any) => cb(null, 'nope', ''));
    await execNansen('cmd', []); expect(spy).toHaveBeenCalled();
    spy.mockRestore(); delete process.env.NANSEN_DEBUG;
  });

  describe('wrappers', () => {
    it('fetchProfilerTrace', async () => { expect((await fetchProfilerTrace('0x1', 'ethereum', { depth: 1 })).success).toBe(true); });
    it('fetchCounterparties', async () => { expect((await fetchCounterparties('0x1')).success).toBe(true); });
    it('fetchRelatedWallets', async () => { expect((await fetchRelatedWallets('0x1')).success).toBe(true); });
    it('fetchCompare', async () => { expect((await fetchCompare('0xA', '0xB')).success).toBe(true); });
    it('fetchProfilerLabels', async () => { expect((await fetchProfilerLabels('0x1')).success).toBe(true); });
    it('fetchProfilerBalance', async () => { expect((await fetchProfilerBalance('0x1')).success).toBe(true); });
    it('fetchPnlSummary', async () => { expect((await fetchPnlSummary('0x1')).success).toBe(true); });
    it('fetchTransactions', async () => { expect((await fetchTransactions('0x1')).success).toBe(true); });
    it('fetchPortfolioDefi', async () => { expect((await fetchPortfolioDefi('0x1')).success).toBe(true); });
    it('fetchSmartMoneyNetflow', async () => { expect((await fetchSmartMoneyNetflow('eth')).success).toBe(true); });
    it('fetchTokenInfo', async () => { expect((await fetchTokenInfo('ETH')).success).toBe(true); });
    it('fetchWhoBoughtSold', async () => { expect((await fetchWhoBoughtSold('ETH')).success).toBe(true); });
    it('fetchWebSearch', async () => { expect((await fetchWebSearch('0x')).success).toBe(true); });
    it('fetchAccountStatus', async () => { expect((await fetchAccountStatus()).success).toBe(true); });
    it('fetchWalletShow', async () => { expect((await fetchWalletShow('0x1')).success).toBe(true); });
    it('fetchSchema', async () => { expect((await fetchSchema()).success).toBe(true); });
    it('checkNansenInstalled', async () => { expect(await checkNansenInstalled()).toBe(true); });
  });
});
