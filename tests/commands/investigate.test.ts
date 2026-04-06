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
vi.mock('../../src/lib/mock.js', () => ({ IS_MOCK: true }));
vi.mock('open', () => ({ default: vi.fn() }));
vi.mock('ora', () => ({
  default: vi.fn(() => ({ start: vi.fn().mockReturnThis(), succeed: vi.fn(), fail: vi.fn(), stop: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));
vi.mock('boxen', () => ({ default: vi.fn((t: string) => t) }));

import { createInvestigateCommand } from '../../src/commands/investigate.js';
import { buildGraph } from '../../src/lib/graph-builder.js';
import { renderGraph } from '../../src/lib/html-renderer.js';

const mockBuild = buildGraph as ReturnType<typeof vi.fn>;
const mockRender = renderGraph as ReturnType<typeof vi.fn>;

const mockGraph = {
  nodes: [{ id: '0xseed', label: 'Seed', type: 'seed', balance_usd: 0, pnl_30d: 0, labels: [], sm_labels: [], depth: 0, defi_protocols: 0 }],
  links: [],
  meta: { seed: '0xseed', depth: 2, width: 10, chain: 'ethereum', api_calls: 5, cache_hits: 2, started_at: new Date().toISOString(), duration_ms: 1000, total_nodes: 1, total_edges: 0, smart_money_count: 0, labeled_count: 0 },
};

describe('investigate command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuild.mockResolvedValue(mockGraph);
    mockRender.mockReturnValue('/tmp/test.html');
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
    } catch {
      // Commander may throw on exitOverride
    }

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
    } catch {
      // Commander may throw on exitOverride
    }

    // Should have called console.log with JSON output
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
});
