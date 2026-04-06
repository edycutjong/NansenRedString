import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('../../src/lib/nansen.js', () => ({
  fetchProfilerLabels: vi.fn(), fetchProfilerBalance: vi.fn(),
  fetchPnlSummary: vi.fn(), fetchPortfolioDefi: vi.fn(), fetchTransactions: vi.fn(),
}));
vi.mock('../../src/lib/telemetry.js', () => ({
  printReceipt: vi.fn(), resetLog: vi.fn(),
}));
vi.mock('boxen', () => ({ default: vi.fn((t: string) => t) }));

import { createProfileCommand } from '../../src/commands/profile.js';
import { fetchProfilerLabels, fetchProfilerBalance, fetchPnlSummary, fetchPortfolioDefi, fetchTransactions } from '../../src/lib/nansen.js';

const mockLabels = fetchProfilerLabels as ReturnType<typeof vi.fn>;
const mockBalance = fetchProfilerBalance as ReturnType<typeof vi.fn>;
const mockPnl = fetchPnlSummary as ReturnType<typeof vi.fn>;
const mockDefi = fetchPortfolioDefi as ReturnType<typeof vi.fn>;
const mockTx = fetchTransactions as ReturnType<typeof vi.fn>;

describe('profile command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLabels.mockResolvedValue({ success: true, data: [{ label: 'Whale', category: 'SM' }] });
    mockBalance.mockResolvedValue({ success: true, data: { total_usd: 1000000, tokens: [{ symbol: 'ETH', value_usd: 800000 }] } });
    mockPnl.mockResolvedValue({ success: true, data: { total_pnl_usd: 50000, win_rate: 0.65, total_trades: 120 } });
    mockDefi.mockResolvedValue({ success: true, data: [{ protocol: 'Aave', value_usd: 100000, type: 'lending' }] });
    mockTx.mockResolvedValue({ success: true, data: [{ hash: '0xabc', value_usd: 5000 }] });
  });

  it('should create a valid Commander command', () => {
    const cmd = createProfileCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('profile');
  });

  it('should have chain and json options', () => {
    const cmd = createProfileCommand();
    const optNames = cmd.options.map(o => o.long);
    expect(optNames).toContain('--chain');
    expect(optNames).toContain('--json');
  });

  it('should fetch all data in parallel', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const parent = new Command();
    parent.addCommand(createProfileCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['profile', '0x123'], { from: 'user' });
    } catch { /* */ }

    expect(mockLabels).toHaveBeenCalledWith('0x123', 'ethereum');
    expect(mockBalance).toHaveBeenCalledWith('0x123', 'ethereum');
    expect(mockPnl).toHaveBeenCalledWith('0x123', 'ethereum');
    expect(mockDefi).toHaveBeenCalledWith('0x123', 'ethereum');
    expect(mockTx).toHaveBeenCalledWith('0x123', 'ethereum', 5);
    spy.mockRestore();
  });

  it('should handle all API failures gracefully', async () => {
    mockLabels.mockResolvedValue({ success: false });
    mockBalance.mockResolvedValue({ success: false });
    mockPnl.mockResolvedValue({ success: false });
    mockDefi.mockResolvedValue({ success: false });
    mockTx.mockResolvedValue({ success: false });

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const parent = new Command();
    parent.addCommand(createProfileCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['profile', '0x456'], { from: 'user' });
    } catch { /* */ }

    // Should not throw — degrades gracefully
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should output JSON when --json flag', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const parent = new Command();
    parent.addCommand(createProfileCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['profile', '0x789', '--json'], { from: 'user' });
    } catch { /* */ }

    const jsonCalls = spy.mock.calls.filter(c => {
      try { JSON.parse(c[0]); return true; } catch { return false; }
    });
    expect(jsonCalls.length).toBeGreaterThan(0);
    spy.mockRestore();
  });

  it('should use custom chain param', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const parent = new Command();
    parent.addCommand(createProfileCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['profile', '0xabc', '--chain', 'polygon'], { from: 'user' });
    } catch { /* */ }

    expect(mockLabels).toHaveBeenCalledWith('0xabc', 'polygon');
    spy.mockRestore();
  });
});
