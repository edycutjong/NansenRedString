import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

vi.mock('../../src/lib/graph-builder.js', () => ({
  buildGraph: vi.fn(),
}));
vi.mock('../../src/lib/html-renderer.js', () => ({
  renderGraph: vi.fn().mockReturnValue('/tmp/test-output.html'),
}));
vi.mock('../../src/lib/telemetry.js', () => ({
  printTelemetryReceipt: vi.fn(), printReceipt: vi.fn(), resetTelemetry: vi.fn(), resetLog: vi.fn(),
  getCallCount: vi.fn().mockReturnValue(5), getCacheHits: vi.fn().mockReturnValue(2),
}));
vi.mock('../../src/lib/terminal-report.js', () => ({
  printTerminalReport: vi.fn(), printHollywoodStart: vi.fn(), printBfsProgress: vi.fn(),
  printEnrichmentProgress: vi.fn(), printSmCluster: vi.fn(), printCompileStart: vi.fn(), printLaunchSuccess: vi.fn(),
}));
vi.mock('../../src/lib/osint.js', () => ({ gatherOsint: vi.fn().mockResolvedValue([]) }));
vi.mock('../../src/lib/nansen.js', () => ({ checkNansenInstalled: vi.fn().mockResolvedValue(true) }));

let mockISMOCK = true;
vi.mock('../../src/lib/mock.js', () => ({
  get IS_MOCK() { return mockISMOCK; },
}));

vi.mock('open', () => ({ default: vi.fn() }));
vi.mock('ora', () => ({
  default: vi.fn(() => ({ start: vi.fn().mockReturnThis(), succeed: vi.fn(), fail: vi.fn(), stop: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));
vi.mock('boxen', () => ({ default: vi.fn((t: string) => t) }));

import { createInvestigateCommand } from '../../src/commands/investigate.js';
import { buildGraph } from '../../src/lib/graph-builder.js';
import { renderGraph } from '../../src/lib/html-renderer.js';
import { gatherOsint } from '../../src/lib/osint.js';
import { checkNansenInstalled } from '../../src/lib/nansen.js';
import openMod from 'open';

const mockBuild = buildGraph as ReturnType<typeof vi.fn>;
const mockRender = renderGraph as ReturnType<typeof vi.fn>;
const mockOsint = gatherOsint as ReturnType<typeof vi.fn>;
const mockCheckNansen = checkNansenInstalled as ReturnType<typeof vi.fn>;
const mockOpen = openMod as unknown as ReturnType<typeof vi.fn>;

const mockGraph = {
  nodes: [{ id: '0xseed', label: 'Seed', type: 'seed', balance_usd: 0, pnl_30d: 0, labels: [], sm_labels: [], depth: 0, defi_protocols: 0 }],
  links: [],
  meta: { seed: '0xseed', depth: 2, width: 10, chain: 'ethereum', api_calls: 5, cache_hits: 2, started_at: new Date().toISOString(), duration_ms: 1000, total_nodes: 1, total_edges: 0, smart_money_count: 0, labeled_count: 0 },
};

describe('investigate command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockISMOCK = true;
    mockBuild.mockResolvedValue(mockGraph);
    mockRender.mockReturnValue('/tmp/test.html');
    mockOsint.mockResolvedValue([]);
    mockCheckNansen.mockResolvedValue(true);
  });

  it('should create a valid Commander command', () => {
    const cmd = createInvestigateCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('investigate');
  });

  it('should have correct options', () => {
    const cmd = createInvestigateCommand();
    const optNames = cmd.options.map(o => o.long);
    expect(optNames).toContain('--depth');
    expect(optNames).toContain('--width');
    expect(optNames).toContain('--chain');
    expect(optNames).toContain('--osint');
    expect(optNames).toContain('--output');
    expect(optNames).toContain('--json');
  });

  it('should run action and build graph', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--depth', '2', '--no-open'], { from: 'user' });
    } catch { /* Commander may throw on exitOverride */ }

    expect(mockBuild).toHaveBeenCalled();
    const calledOpts = mockBuild.mock.calls[0][0];
    expect(calledOpts.address).toBe('0xdead');
    expect(calledOpts.depth).toBe(2);

    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should handle --json flag', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--json', '--no-open'], { from: 'user' });
    } catch { /* Commander may throw on exitOverride */ }

    const jsonCalls = spy.mock.calls.filter(c => {
      try { JSON.parse(c[0]); return true; } catch { return false; }
    });
    expect(jsonCalls.length).toBeGreaterThan(0);

    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should clamp depth to valid range', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--depth', '99', '--no-open'], { from: 'user' });
    } catch { /* */ }

    const calledOpts = mockBuild.mock.calls[0][0];
    expect(calledOpts.depth).toBe(3); // Clamped to max 3

    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should clamp width to min 5', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--width', '1', '--no-open'], { from: 'user' });
    } catch { /* */ }

    const calledOpts = mockBuild.mock.calls[0][0];
    expect(calledOpts.width).toBe(5);

    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should fallback on invalid options', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--depth', 'abc', '--width', 'xyz', '--chain', '', '--no-open'], { from: 'user' });
    } catch { /* */ }

    const calledOpts = mockBuild.mock.calls[0][0];
    expect(calledOpts.depth).toBe(2);
    expect(calledOpts.width).toBe(10);
    expect(calledOpts.chain).toBe('ethereum');

    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should handle BFS failure gracefully', async () => {
    mockBuild.mockRejectedValue(new Error('API timeout'));
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--no-open'], { from: 'user' });
    } catch { /* */ }

    expect(exitSpy).toHaveBeenCalledWith(1);

    spy.mockRestore();
    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should run OSINT when --osint flag is set', async () => {
    mockOsint.mockResolvedValue([{ url: 'https://example.com', snippet: 'info' }]);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--osint', '--no-open'], { from: 'user' });
    } catch { /* */ }

    expect(mockOsint).toHaveBeenCalledWith('0xdead');

    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should handle OSINT returning empty results', async () => {
    mockOsint.mockResolvedValue([]);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--osint', '--no-open'], { from: 'user' });
    } catch { /* */ }

    expect(mockOsint).toHaveBeenCalled();

    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should handle OSINT failure gracefully', async () => {
    mockOsint.mockRejectedValue(new Error('OSINT error'));
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--osint', '--no-open'], { from: 'user' });
    } catch { /* */ }

    // Should not crash — OSINT failures are non-critical
    expect(mockOsint).toHaveBeenCalled();

    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should auto-open browser when --open is default (true)', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead'], { from: 'user' });
    } catch { /* */ }

    expect(mockOpen).toHaveBeenCalled();

    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should check nansen installation in live mode', async () => {
    mockISMOCK = false;
    mockCheckNansen.mockResolvedValue(false);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--no-open'], { from: 'user' });
    } catch { /* */ }

    expect(mockCheckNansen).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    spy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should proceed in live mode when nansen is installed', async () => {
    mockISMOCK = false;
    mockCheckNansen.mockResolvedValue(true);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const parent = new Command();
    parent.addCommand(createInvestigateCommand());
    parent.exitOverride();

    try {
      await parent.parseAsync(['investigate', '0xdead', '--no-open'], { from: 'user' });
    } catch { /* */ }

    expect(mockCheckNansen).toHaveBeenCalled();
    expect(mockBuild).toHaveBeenCalled();

    spy.mockRestore();
    exitSpy.mockRestore();
  });
});
