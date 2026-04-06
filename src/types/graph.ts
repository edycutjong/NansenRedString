/**
 * Graph types for the RedString investigation engine.
 *
 * These types define the shape of the force-directed graph that
 * gets compiled into the interactive 3D HTML visualizer.
 */

// ---------------------------------------------------------------------------
// Node Types
// ---------------------------------------------------------------------------

export type NodeType = 'seed' | 'smart-money' | 'labeled' | 'unknown' | 'contract';

export interface GraphNode {
  /** Wallet address (checksummed or lowercase) */
  id: string;
  /** Human-readable label (Nansen label or truncated address) */
  label: string;
  /** Classification for color coding */
  type: NodeType;
  /** USD balance for node sizing (log scale) */
  balance_usd: number;
  /** 30-day realized PnL for tooltip */
  pnl_30d: number;
  /** All Nansen entity labels */
  labels: string[];
  /** Smart Money-specific labels (Fund, Pro Trader, etc.) */
  sm_labels: string[];
  /** BFS depth from seed wallet (0 = seed) */
  depth: number;
  /** DeFi protocol exposure count */
  defi_protocols: number;
  /** First seen timestamp (ISO) */
  first_seen?: string;
}

// ---------------------------------------------------------------------------
// Edge Types
// ---------------------------------------------------------------------------

export type FlowDirection = 'inflow' | 'outflow' | 'bidirectional';

export interface GraphEdge {
  /** Source wallet address */
  source: string;
  /** Target wallet address */
  target: string;
  /** Transfer volume in USD */
  volume_usd: number;
  /** Number of transactions */
  tx_count: number;
  /** Flow direction relative to source */
  direction: FlowDirection;
  /** Primary token transferred (if identifiable) */
  primary_token?: string;
}

// ---------------------------------------------------------------------------
// Graph Data (the full dataset injected into HTML)
// ---------------------------------------------------------------------------

export interface GraphData {
  /** All discovered nodes */
  nodes: GraphNode[];
  /** All discovered edges */
  links: GraphEdge[];
  /** Investigation metadata */
  meta: InvestigationMeta;
}

export interface InvestigationMeta {
  /** Seed wallet address */
  seed: string;
  /** BFS depth used */
  depth: number;
  /** BFS width (max counterparties per node) */
  width: number;
  /** Chain analyzed */
  chain: string;
  /** Total API calls made */
  api_calls: number;
  /** Cache hits during this investigation */
  cache_hits: number;
  /** Investigation start time (ISO) */
  started_at: string;
  /** Investigation duration in ms */
  duration_ms: number;
  /** Total unique wallets discovered */
  total_nodes: number;
  /** Total connections discovered */
  total_edges: number;
  /** Smart Money nodes found */
  smart_money_count: number;
  /** Labeled entity nodes found */
  labeled_count: number;
}
