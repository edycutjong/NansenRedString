/**
 * Graph Builder — BFS traversal engine for RedString.
 *
 * Starting from a seed wallet, performs breadth-first search through
 * the wallet's counterparty network using Nansen CLI endpoints.
 * Builds an adjacency matrix (nodes + edges) for 3D visualization.
 *
 * Key safety mechanisms:
 *  - Visited set prevents infinite loops
 *  - Depth guard prevents runaway recursion
 *  - Width control limits counterparties per node
 *  - All API calls go through disk cache
 */

import type { GraphNode, GraphEdge, GraphData, InvestigationMeta, NodeType, FlowDirection } from '../types/graph.js';
import type { InvestigationOptions } from '../types/investigation.js';
import { fetchProfilerTrace, fetchCounterparties } from './nansen.js';
import { enrichNode } from './enricher.js';
import { getCallCount, getCacheHits } from './telemetry.js';

// ---------------------------------------------------------------------------
// BFS Engine
// ---------------------------------------------------------------------------

export async function buildGraph(options: InvestigationOptions): Promise<GraphData> {
  const startTime = Date.now();
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const visited = new Set<string>();

  // Create seed node (will be enriched)
  const seedNode = createBaseNode(options.address, 0);
  seedNode.type = 'seed';
  nodes.set(options.address, seedNode);

  // BFS Queue: [address, depth]
  const queue: [string, number][] = [[options.address, 0]];
  visited.add(options.address.toLowerCase());

  while (queue.length > 0) {
    const entry = queue.shift();
    /* v8 ignore next */
    if (!entry) break;
    const [currentAddress, currentDepth] = entry;

    // Depth guard — stop going deeper
    if (currentDepth >= options.depth) continue;

    // Fetch connections for this node
    const connections = await fetchConnections(currentAddress, options);

    for (const conn of connections) {
      const normalizedAddr = conn.address.toLowerCase();

      // Volume filter
      if (conn.volume_usd < options.minVolume) continue;

      // Add edge (always — even if node was already visited)
      const existingEdge = edges.find(
        e => (e.source === currentAddress && e.target === conn.address) ||
             (e.source === conn.address && e.target === currentAddress)
      );
      if (!existingEdge) {
        edges.push({
          source: currentAddress,
          target: conn.address,
          volume_usd: conn.volume_usd,
          tx_count: conn.tx_count,
          direction: normalizeDirection(conn.direction),
          primary_token: conn.primary_token,
        });
      }

      // Skip if already visited
      if (visited.has(normalizedAddr)) continue;
      visited.add(normalizedAddr);

      // Create new node
      const newNode = createBaseNode(conn.address, currentDepth + 1);
      if (conn.label) newNode.label = conn.label;
      nodes.set(conn.address, newNode);

      // Queue for further traversal (if within depth)
      if (currentDepth + 1 < options.depth) {
        queue.push([conn.address, currentDepth + 1]);
      }
    }
  }

  // Enrich all nodes with labels, balance, PnL, SM tags
  await enrichAllNodes(nodes, options);

  const meta: InvestigationMeta = {
    seed: options.address,
    depth: options.depth,
    width: options.width,
    chain: options.chain,
    api_calls: getCallCount(),
    cache_hits: getCacheHits(),
    started_at: new Date(startTime).toISOString(),
    duration_ms: Date.now() - startTime,
    total_nodes: nodes.size,
    total_edges: edges.length,
    smart_money_count: [...nodes.values()].filter(n => n.type === 'smart-money').length,
    labeled_count: [...nodes.values()].filter(n => n.type === 'labeled').length,
  };

  return {
    nodes: [...nodes.values()],
    links: edges,
    meta,
  };
}

// ---------------------------------------------------------------------------
// Connection Fetching
// ---------------------------------------------------------------------------

interface RawConnection {
  address: string;
  volume_usd: number;
  tx_count: number;
  direction: string;
  label?: string;
  primary_token?: string;
}

async function fetchConnections(address: string, options: InvestigationOptions): Promise<RawConnection[]> {
  // Try profiler trace first
  const traceResult = await fetchProfilerTrace(address, options.chain, {
    depth: 1, // We do our own BFS — only request immediate connections
    width: options.width,
    noCache: options.noCache,
  });

  if (traceResult.success && traceResult.data) {
    const data = traceResult.data as any;
    if (data.connections && Array.isArray(data.connections)) {
      return data.connections.slice(0, options.width).map((c: any) => ({
        address: c.address,
        volume_usd: c.volume_usd || 0,
        tx_count: c.tx_count || 0,
        direction: c.direction || 'both',
        label: c.label,
        primary_token: c.primary_token,
      }));
    }
  }

  // Fallback to counterparties endpoint
  const cpResult = await fetchCounterparties(address, options.chain, options.width, options.noCache);

  if (cpResult.success && Array.isArray(cpResult.data)) {
    return (cpResult.data as any[]).slice(0, options.width).map((c: any) => ({
      address: c.address,
      volume_usd: c.volume_usd || 0,
      tx_count: c.tx_count || 0,
      direction: c.direction || 'both',
      label: c.label,
    }));
  }

  return [];
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

async function enrichAllNodes(nodes: Map<string, GraphNode>, options: InvestigationOptions): Promise<void> {
  const enrichPromises = [...nodes.entries()].map(async ([address, node]) => {
    const enriched = await enrichNode(address, options.chain);
    node.labels = enriched.labels;
    node.sm_labels = enriched.sm_labels;
    node.balance_usd = enriched.balance_usd;
    node.pnl_30d = enriched.pnl_30d;
    node.defi_protocols = enriched.defi_protocols;
    node.type = classifyNodeType(node, address === options.address);
    if (enriched.labels.length > 0 && node.label === truncateAddress(address)) {
      node.label = enriched.labels[0];
    }
  });

  // Process in batches to avoid overwhelming API
  const BATCH_SIZE = 5;
  for (let i = 0; i < enrichPromises.length; i += BATCH_SIZE) {
    await Promise.all(enrichPromises.slice(i, i + BATCH_SIZE));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createBaseNode(address: string, depth: number): GraphNode {
  return {
    id: address,
    label: truncateAddress(address),
    type: 'unknown',
    balance_usd: 0,
    pnl_30d: 0,
    labels: [],
    sm_labels: [],
    depth,
    defi_protocols: 0,
  };
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function classifyNodeType(node: GraphNode, isSeed: boolean): NodeType {
  if (isSeed) return 'seed';
  if (node.sm_labels.length > 0) return 'smart-money';
  if (node.labels.some(l => l.toLowerCase().includes('contract') || l.toLowerCase().includes('router'))) return 'contract';
  if (node.labels.length > 0) return 'labeled';
  return 'unknown';
}

function normalizeDirection(dir: string): FlowDirection {
  if (dir === 'in' || dir === 'inflow') return 'inflow';
  if (dir === 'out' || dir === 'outflow') return 'outflow';
  return 'bidirectional';
}
