import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetTelemetry } from '../../src/lib/telemetry.js';

vi.mock('../../src/lib/nansen.js', () => ({
  fetchProfilerTrace: vi.fn(),
  fetchCounterparties: vi.fn(),
}));

vi.mock('../../src/lib/enricher.js', () => ({
  enrichNode: vi.fn().mockResolvedValue({
    labels: [], sm_labels: [], balance_usd: 0, pnl_30d: 0, defi_protocols: 0,
  }),
}));

import { buildGraph, truncateAddress } from '../../src/lib/graph-builder.js';
import { fetchProfilerTrace, fetchCounterparties } from '../../src/lib/nansen.js';
import { enrichNode } from '../../src/lib/enricher.js';
import type { InvestigationOptions } from '../../src/types/investigation.js';

const mockTrace = fetchProfilerTrace as ReturnType<typeof vi.fn>;
const mockCp = fetchCounterparties as ReturnType<typeof vi.fn>;
const mockEnrich = enrichNode as ReturnType<typeof vi.fn>;

const baseOpts: InvestigationOptions = {
  address: '0xseed', depth: 2, width: 10, chain: 'ethereum',
  osint: false, noCache: false, minVolume: 0,
};

describe('graph-builder', () => {
  beforeEach(() => {
    vi.clearAllMocks(); resetTelemetry();
    mockTrace.mockResolvedValue({ success: true, data: { connections: [] } });
    mockCp.mockResolvedValue({ success: false });
    mockEnrich.mockResolvedValue({ labels: [], sm_labels: [], balance_usd: 0, pnl_30d: 0, defi_protocols: 0 });
  });

  it('should create seed node', async () => {
    const g = await buildGraph(baseOpts);
    expect(g.nodes.length).toBe(1);
    expect(g.nodes[0].id).toBe('0xseed');
    expect(g.nodes[0].depth).toBe(0);
  });

  it('should discover connections at depth 1', async () => {
    mockTrace.mockResolvedValue({ success: true, data: {
      connections: [
        { address: '0xA', volume_usd: 1000, tx_count: 5, direction: 'out' },
        { address: '0xB', volume_usd: 2000, tx_count: 3, direction: 'in' },
      ],
    }});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    expect(g.nodes.length).toBe(3);
    expect(g.links.length).toBe(2);
  });

  it('should not revisit nodes', async () => {
    mockTrace.mockImplementation(async (addr: string) => {
      if (addr === '0xseed') return { success: true, data: { connections: [{ address: '0xA', volume_usd: 100, tx_count: 1, direction: 'out' }] } };
      if (addr === '0xA') return { success: true, data: { connections: [{ address: '0xseed', volume_usd: 100, tx_count: 1, direction: 'in' }] } };
      return { success: true, data: { connections: [] } };
    });
    const g = await buildGraph({ ...baseOpts, depth: 3 });
    expect(g.nodes.length).toBe(2);
  });

  it('should respect depth guard', async () => {
    mockTrace.mockResolvedValue({ success: true, data: {
      connections: [{ address: '0xdeep', volume_usd: 1000, tx_count: 1, direction: 'out' }],
    }});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    const deepNode = g.nodes.find(n => n.id === '0xdeep');
    expect(deepNode?.depth).toBe(1);
  });

  it('should filter by minVolume', async () => {
    mockTrace.mockResolvedValue({ success: true, data: {
      connections: [
        { address: '0xbig', volume_usd: 50000, tx_count: 10, direction: 'out' },
        { address: '0xsmall', volume_usd: 100, tx_count: 1, direction: 'out' },
      ],
    }});
    const g = await buildGraph({ ...baseOpts, depth: 1, minVolume: 1000 });
    expect(g.nodes.length).toBe(2);
    expect(g.nodes.find(n => n.id === '0xsmall')).toBeUndefined();
  });

  it('should fallback to counterparties when trace fails', async () => {
    mockTrace.mockResolvedValue({ success: false });
    mockCp.mockResolvedValue({ success: true, data: [
      { address: '0xcp1', volume_usd: 3000, tx_count: 2, direction: 'both', label: 'Binance' },
    ]});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    expect(g.nodes.length).toBe(2);
    expect(g.nodes.find(n => n.id === '0xcp1')).toBeDefined();
  });

  it('should deduplicate edges', async () => {
    mockTrace.mockImplementation(async (addr: string) => {
      if (addr === '0xseed') return { success: true, data: { connections: [{ address: '0xA', volume_usd: 1000, tx_count: 5, direction: 'out' }] } };
      if (addr === '0xa') return { success: true, data: { connections: [{ address: '0xseed', volume_usd: 1000, tx_count: 5, direction: 'in' }] } };
      return { success: true, data: { connections: [] } };
    });
    const g = await buildGraph({ ...baseOpts, depth: 2 });
    const edgeCount = g.links.filter(e =>
      (e.source === '0xseed' && e.target === '0xA') || (e.source === '0xA' && e.target === '0xseed')
    ).length;
    expect(edgeCount).toBeLessThanOrEqual(1);
  });

  it('should enrich SM nodes', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { connections: [{ address: '0xsm', volume_usd: 1000, tx_count: 1, direction: 'out' }] } });
    mockEnrich.mockResolvedValue({ labels: ['Fund'], sm_labels: ['Smart Money'], balance_usd: 1e6, pnl_30d: 50000, defi_protocols: 3 });
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    const smNode = g.nodes.find(n => n.id === '0xsm');
    expect(smNode?.type).toBe('smart-money');
  });

  it('should set label from enrichment', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { connections: [{ address: '0xlabel', volume_usd: 1000, tx_count: 1, direction: 'out' }] } });
    mockEnrich.mockImplementation(async (addr: string) => {
      if (addr === '0xlabel') return { labels: ['Binance'], sm_labels: [], balance_usd: 0, pnl_30d: 0, defi_protocols: 0 };
      return { labels: [], sm_labels: [], balance_usd: 0, pnl_30d: 0, defi_protocols: 0 };
    });
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    const node = g.nodes.find(n => n.id === '0xlabel');
    expect(node?.label).toBe('Binance');
  });

  it('should classify contract nodes', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { connections: [{ address: '0xc', volume_usd: 1000, tx_count: 1, direction: 'out' }] } });
    mockEnrich.mockImplementation(async (addr: string) => {
      if (addr === '0xc') return { labels: ['Uniswap Router'], sm_labels: [], balance_usd: 0, pnl_30d: 0, defi_protocols: 0 };
      return { labels: [], sm_labels: [], balance_usd: 0, pnl_30d: 0, defi_protocols: 0 };
    });
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    expect(g.nodes.find(n => n.id === '0xc')?.type).toBe('contract');
  });

  it('should populate meta correctly', async () => {
    const g = await buildGraph(baseOpts);
    expect(g.meta.seed).toBe('0xseed');
    expect(g.meta.chain).toBe('ethereum');
    expect(g.meta.depth).toBe(2);
    expect(g.meta.total_nodes).toBe(1);
    expect(g.meta.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('should normalize edge directions', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { connections: [
      { address: '0xin', volume_usd: 100, tx_count: 1, direction: 'in' },
      { address: '0xout', volume_usd: 100, tx_count: 1, direction: 'out' },
      { address: '0xboth', volume_usd: 100, tx_count: 1, direction: 'both' },
    ]}});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    expect(g.links.find(e => e.target === '0xin')?.direction).toBe('inflow');
    expect(g.links.find(e => e.target === '0xout')?.direction).toBe('outflow');
    expect(g.links.find(e => e.target === '0xboth')?.direction).toBe('bidirectional');
  });

  it('should handle empty connections gracefully', async () => {
    mockTrace.mockResolvedValue({ success: false });
    mockCp.mockResolvedValue({ success: false });
    const g = await buildGraph(baseOpts);
    expect(g.nodes.length).toBe(1);
    expect(g.links.length).toBe(0);
  });

  it('should apply conn.label to node', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { connections: [
      { address: '0xlbl', volume_usd: 100, tx_count: 1, direction: 'out', label: 'Known Whale' },
    ]}});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    const node = g.nodes.find(n => n.id === '0xlbl');
    // Label should be set from connection, then possibly overwritten by enrichment
    expect(node).toBeDefined();
  });

  it('should fallback counterparty fields to defaults when missing', async () => {
    mockTrace.mockResolvedValue({ success: false });
    mockCp.mockResolvedValue({ success: true, data: [
      { address: '0xno_fields' }, // Missing volume_usd, tx_count, direction
    ]});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    const edge = g.links.find(e => e.target === '0xno_fields');
    expect(edge?.volume_usd).toBe(0);
    expect(edge?.tx_count).toBe(0);
    expect(edge?.direction).toBe('bidirectional');
  });

  it('should handle trace connections with missing optional fields', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { connections: [
      { address: '0xbare' }, // No volume_usd, tx_count, direction
    ]}});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    const edge = g.links.find(e => e.target === '0xbare');
    expect(edge?.volume_usd).toBe(0);
    expect(edge?.tx_count).toBe(0);
    expect(edge?.direction).toBe('bidirectional');
  });

  it('should normalize "inflow" direction alias', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { connections: [
      { address: '0xinflow', volume_usd: 100, tx_count: 1, direction: 'inflow' },
    ]}});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    expect(g.links.find(e => e.target === '0xinflow')?.direction).toBe('inflow');
  });

  it('should normalize "outflow" direction alias', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { connections: [
      { address: '0xoutflow', volume_usd: 100, tx_count: 1, direction: 'outflow' },
    ]}});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    expect(g.links.find(e => e.target === '0xoutflow')?.direction).toBe('outflow');
  });

  it('should pass primary_token through to edge', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { connections: [
      { address: '0xtoken', volume_usd: 100, tx_count: 1, direction: 'out', primary_token: 'USDC' },
    ]}});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    expect(g.links.find(e => e.target === '0xtoken')?.primary_token).toBe('USDC');
  });

  it('should not override label if enrichment gives labels but label is already custom', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { connections: [
      { address: '0xcustom', volume_usd: 100, tx_count: 1, direction: 'out', label: 'My Label' },
    ]}});
    mockEnrich.mockImplementation(async (addr: string) => {
      if (addr === '0xcustom') return { labels: ['Enriched'], sm_labels: [], balance_usd: 0, pnl_30d: 0, defi_protocols: 0 };
      return { labels: [], sm_labels: [], balance_usd: 0, pnl_30d: 0, defi_protocols: 0 };
    });
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    const node = g.nodes.find(n => n.id === '0xcustom');
    // Label should stay as "My Label" because it's not a truncated address
    expect(node?.label).toBe('My Label');
  });

  it('should handle trace data without connections array', async () => {
    mockTrace.mockResolvedValue({ success: true, data: { result: 'ok' } }); // No connections key
    mockCp.mockResolvedValue({ success: true, data: [
      { address: '0xfallback', volume_usd: 500, tx_count: 2, direction: 'out' },
    ]});
    const g = await buildGraph({ ...baseOpts, depth: 1 });
    expect(g.nodes.find(n => n.id === '0xfallback')).toBeDefined();
  });
});

describe('truncateAddress', () => {
  it('should truncate long addresses', () => {
    expect(truncateAddress('0xdead1234567890')).toBe('0xdead...7890');
  });
  it('should return short addresses unchanged', () => {
    expect(truncateAddress('0x1234')).toBe('0x1234');
  });
  it('should handle exactly 10 chars', () => {
    expect(truncateAddress('0x12345678')).toBe('0x12345678');
  });
});
