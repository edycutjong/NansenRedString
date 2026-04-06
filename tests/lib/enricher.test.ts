import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the nansen module to prevent actual CLI calls
vi.mock('../../src/lib/nansen.js', () => ({
  fetchProfilerLabels: vi.fn(),
  fetchProfilerBalance: vi.fn(),
  fetchPnlSummary: vi.fn(),
  fetchPortfolioDefi: vi.fn(),
}));

import { enrichNode } from '../../src/lib/enricher.js';
import { fetchProfilerLabels, fetchProfilerBalance, fetchPnlSummary, fetchPortfolioDefi } from '../../src/lib/nansen.js';

const mockLabels = fetchProfilerLabels as ReturnType<typeof vi.fn>;
const mockBalance = fetchProfilerBalance as ReturnType<typeof vi.fn>;
const mockPnl = fetchPnlSummary as ReturnType<typeof vi.fn>;
const mockDefi = fetchPortfolioDefi as ReturnType<typeof vi.fn>;

describe('enricher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default values when all API calls fail', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0x111');
    expect(result.labels).toEqual([]);
    expect(result.sm_labels).toEqual([]);
    expect(result.balance_usd).toBe(0);
    expect(result.pnl_30d).toBe(0);
    expect(result.defi_protocols).toBe(0);
  });

  it('should extract labels from API response', async () => {
    mockLabels.mockResolvedValue({
      success: true,
      data: [
        { label: 'Binance', tag: 'CEX', category: 'Exchange' },
        { label: 'DEX Trader', tag: 'Trader', category: 'Active' },
      ],
    });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0x222');
    expect(result.labels).toEqual(['Binance', 'DEX Trader']);
    expect(result.sm_labels).toEqual([]);
  });

  it('should detect Smart Money labels', async () => {
    mockLabels.mockResolvedValue({
      success: true,
      data: [
        { label: 'Crypto Fund', tag: 'Fund', category: 'Smart Money' },
        { label: 'Pro Trader', tag: 'whale', category: 'Smart Money' },
      ],
    });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0x333');
    expect(result.sm_labels).toHaveLength(2);
    expect(result.sm_labels).toContain('Crypto Fund');
    expect(result.sm_labels).toContain('Pro Trader');
  });

  it('should extract balance from response', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: true, data: { total_usd: 1500000 } });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0x444');
    expect(result.balance_usd).toBe(1500000);
  });

  it('should handle missing total_usd in balance', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: true, data: {} });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0x444b');
    expect(result.balance_usd).toBe(0);
  });

  it('should extract PnL from response (total_pnl_usd)', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: true, data: { total_pnl_usd: 57000 } });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0x555');
    expect(result.pnl_30d).toBe(57000);
  });

  it('should extract PnL from realized_pnl_usd fallback', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: true, data: { realized_pnl_usd: 30000 } });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0x555b');
    expect(result.pnl_30d).toBe(30000);
  });

  it('should count DeFi protocols', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({
      success: true,
      data: [
        { protocol: 'Aave', value_usd: 100000 },
        { protocol: 'Uniswap', value_usd: 50000 },
        { protocol: 'Lido', value_usd: 200000 },
      ],
    });

    const result = await enrichNode('0x666');
    expect(result.defi_protocols).toBe(3);
  });

  it('should handle non-array defi data gracefully', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: true, data: { not: 'an array' } });

    const result = await enrichNode('0x777');
    expect(result.defi_protocols).toBe(0);
  });

  it('should handle non-array labels data gracefully', async () => {
    mockLabels.mockResolvedValue({ success: true, data: 'not an array' });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0x888');
    expect(result.labels).toEqual([]);
  });

  it('should pass chain parameter through', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    await enrichNode('0x999', 'polygon');

    expect(mockLabels).toHaveBeenCalledWith('0x999', 'polygon');
    expect(mockBalance).toHaveBeenCalledWith('0x999', 'polygon');
    expect(mockPnl).toHaveBeenCalledWith('0x999', 'polygon');
    expect(mockDefi).toHaveBeenCalledWith('0x999', 'polygon');
  });

  it('should use default ethereum chain', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    await enrichNode('0xaaa');

    expect(mockLabels).toHaveBeenCalledWith('0xaaa', 'ethereum');
  });

  it('should filter labels with name fallback', async () => {
    mockLabels.mockResolvedValue({
      success: true,
      data: [{ name: 'ByName' }, { label: '' }, { label: 'ByLabel' }],
    });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0xbbb');
    expect(result.labels).toContain('ByName');
    expect(result.labels).toContain('ByLabel');
    expect(result.labels).not.toContain('');
  });

  it('should use tag as SM label fallback', async () => {
    mockLabels.mockResolvedValue({
      success: true,
      data: [{ tag: 'market maker', category: 'Smart Money' }],
    });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0xccc');
    expect(result.sm_labels).toContain('market maker');
  });

  it('should default SM label to "Smart Money" when no label or tag', async () => {
    mockLabels.mockResolvedValue({
      success: true,
      data: [{ category: 'institutional' }],
    });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0xddd');
    expect(result.sm_labels).toContain('Smart Money');
  });

  it('should use realized_pnl_usd when total_pnl_usd is 0 (falsy)', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: true, data: { total_pnl_usd: 0, realized_pnl_usd: 42000 } });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0xpnlfall');
    expect(result.pnl_30d).toBe(42000);
  });

  it('should return 0 when both PnL fields are missing', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: true, data: {} });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0xnopnl');
    expect(result.pnl_30d).toBe(0);
  });

  it('should detect SM by "fund" keyword in label field', async () => {
    mockLabels.mockResolvedValue({
      success: true,
      data: [{ label: 'Venture Fund', tag: '', category: '' }],
    });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });

    const result = await enrichNode('0xfund');
    expect(result.sm_labels).toContain('Venture Fund');
  });
});
