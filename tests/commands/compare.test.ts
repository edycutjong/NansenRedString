import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('../../src/lib/nansen.js', () => ({
  fetchCompare: vi.fn(),
}));
vi.mock('../../src/lib/telemetry.js', () => ({
  printReceipt: vi.fn(), resetLog: vi.fn(),
}));
vi.mock('boxen', () => ({ default: vi.fn((t: string) => t) }));

import { createCompareCommand } from '../../src/commands/compare.js';
import { fetchCompare } from '../../src/lib/nansen.js';

const mockFetch = fetchCompare as ReturnType<typeof vi.fn>;

describe('compare command', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a valid Commander command', () => {
    const cmd = createCompareCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('compare');
  });

  it('should have chain and json options', () => {
    const cmd = createCompareCommand();
    const optNames = cmd.options.map(o => o.long);
    expect(optNames).toContain('--chain');
    expect(optNames).toContain('--json');
  });

  it('should call fetchCompare with correct args', async () => {
    mockFetch.mockResolvedValue({ success: true, data: {
      correlation_score: 0.85, common_counterparties: 3, common_tokens: 2, shared_labels: [],
    }});
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createCompareCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['compare', '0xA', '0xB', '--chain', 'polygon'], { from: 'user' });
    } catch { /* */ }

    expect(mockFetch).toHaveBeenCalledWith('0xA', '0xB', 'polygon');
    spy.mockRestore(); exitSpy.mockRestore();
  });

  it('should use default chain ethereum', async () => {
    mockFetch.mockResolvedValue({ success: true, data: { correlation_score: 0.5 } });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createCompareCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['compare', '0xA', '0xB'], { from: 'user' });
    } catch { /* */ }

    expect(mockFetch).toHaveBeenCalledWith('0xA', '0xB', 'ethereum');
    spy.mockRestore(); exitSpy.mockRestore();
  });

  it('should handle failure with process.exit', async () => {
    mockFetch.mockResolvedValue({ success: false, error: 'timeout' });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createCompareCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['compare', '0xA', '0xB'], { from: 'user' });
    } catch { /* */ }

    expect(exitSpy).toHaveBeenCalledWith(1);
    spy.mockRestore(); exitSpy.mockRestore();
  });

  it('should output JSON when --json flag', async () => {
    mockFetch.mockResolvedValue({ success: true, data: { correlation_score: 0.7, shared_labels: ['DEX'] } });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createCompareCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['compare', '0xA', '0xB', '--json'], { from: 'user' });
    } catch { /* */ }

    const jsonCalls = spy.mock.calls.filter(c => {
      try { JSON.parse(c[0]); return true; } catch { return false; }
    });
    expect(jsonCalls.length).toBeGreaterThan(0);
    spy.mockRestore(); exitSpy.mockRestore();
  });
});
