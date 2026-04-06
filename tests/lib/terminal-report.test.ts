import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GraphData } from '../../src/types/graph.js';
import {
  printTerminalReport,
  printLogLine,
  printHollywoodStart,
  printBfsProgress,
  printEnrichmentProgress,
  printSmCluster,
  printCompileStart,
  printLaunchSuccess,
} from '../../src/lib/terminal-report.js';

function createMockGraph(): GraphData {
  return {
    nodes: [
      { id: '0xseed', label: '0xseed...dead', type: 'seed', balance_usd: 1000000, pnl_30d: 50000, labels: [], sm_labels: [], depth: 0, defi_protocols: 2 },
      { id: '0xfund', label: 'Fund Alpha', type: 'smart-money', balance_usd: 5000000, pnl_30d: 200000, labels: ['Fund'], sm_labels: [], depth: 1, defi_protocols: 5 },
      { id: '0xlabel', label: 'Binance', type: 'labeled', balance_usd: 250000, pnl_30d: -10000, labels: ['Binance'], sm_labels: [], depth: 1, defi_protocols: 0 },
      // Use empty label to trigger `truncate` coverage
      { id: '0xunknown_long_address', label: '', type: 'unknown', balance_usd: 500, pnl_30d: 0, labels: [], sm_labels: [], depth: 2, defi_protocols: 0 },
      { id: '0xshort', label: '', type: 'unknown', balance_usd: 100, pnl_30d: 0, labels: [], sm_labels: [], depth: 2, defi_protocols: 0 },
      { id: '0xcontract', label: 'Uniswap Router', type: 'contract', balance_usd: 100000, pnl_30d: 0, labels: ['Contract'], sm_labels: [], depth: 1, defi_protocols: 0 },
    ],
    links: [
      { source: '0xseed', target: '0xfund', volume_usd: 500000, tx_count: 20, direction: 'outflow' },
      { source: '0xseed', target: '0xlabel', volume_usd: 250000, tx_count: 10, direction: 'inflow' },
      { source: '0xseed', target: '0xunknown_long_address', volume_usd: 5000, tx_count: 1, direction: 'bidirectional' },
      { source: '0xshort', target: '0xunknown_long_address', volume_usd: 100, tx_count: 1, direction: 'inflow' },
      { source: '0xfund', target: '0xcontract', volume_usd: 100000, tx_count: 5, direction: 'outflow' },
    ],
    meta: {
      seed: '0xseed1234567890abcdef1234567890abcdef',
      depth: 2,
      width: 10,
      chain: 'ethereum',
      api_calls: 25,
      cache_hits: 8,
      started_at: new Date().toISOString(),
      duration_ms: 5200,
      total_nodes: 5,
      total_edges: 4,
      smart_money_count: 1,
      labeled_count: 1,
    },
  };
}

describe('terminal-report', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // Need to import afterEach
  it('should print terminal report without errors', () => {
    printTerminalReport(createMockGraph());
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle empty nodes and links', () => {
    const emptyGraph: GraphData = {
      nodes: [],
      links: [],
      meta: {
        seed: '0xempty',
        depth: 1,
        width: 5,
        chain: 'ethereum',
        api_calls: 1,
        cache_hits: 0,
        started_at: new Date().toISOString(),
        duration_ms: 100,
        total_nodes: 0,
        total_edges: 0,
        smart_money_count: 0,
        labeled_count: 0,
      },
    };
    printTerminalReport(emptyGraph);
    expect(consoleSpy).toHaveBeenCalled();
  });

  describe('printLogLine', () => {
    it('should print formatted log with icon', () => {
      printLogLine('+', 'Test message', 'red');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should default to white color', () => {
      printLogLine('!', 'Warning');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('printHollywoodStart', () => {
    it('should print target locked message', () => {
      printHollywoodStart('0xdead1234567890abcdef');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('printBfsProgress', () => {
    it('should print BFS progress', () => {
      printBfsProgress(1, 3, 5);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not print discovery for 0 nodes', () => {
      consoleSpy.mockClear();
      printBfsProgress(1, 2, 0);
      // Should only call log once (the BFS line, not the discovery line)
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('printEnrichmentProgress', () => {
    it('should print enrichment count', () => {
      printEnrichmentProgress(42);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('printSmCluster', () => {
    it('should print SM cluster for count > 0', () => {
      printSmCluster(3);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not print for count 0', () => {
      consoleSpy.mockClear();
      printSmCluster(0);
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('printCompileStart', () => {
    it('should print compile message', () => {
      printCompileStart();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('printLaunchSuccess', () => {
    it('should print success with output path', () => {
      printLaunchSuccess('/tmp/output.html');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  it('should handle nodes with long labels', () => {
    const graph = createMockGraph();
    graph.nodes[0].label = 'A very long label that exceeds thirty characters in length for testing';
    printTerminalReport(graph);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle low duration (milliseconds)', () => {
    const graph = createMockGraph();
    graph.meta.duration_ms = 500;
    printTerminalReport(graph);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle nodes with millions balance', () => {
    const graph = createMockGraph();
    graph.nodes[0].balance_usd = 5_000_000;
    printTerminalReport(graph);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle nodes with small amounts', () => {
    const graph = createMockGraph();
    graph.nodes[0].balance_usd = 50;
    printTerminalReport(graph);
    expect(consoleSpy).toHaveBeenCalled();
  });
});

// Fix missing import
import { afterEach } from 'vitest';
