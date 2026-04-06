/**
 * Investigation types — high-level result shapes for commands.
 */

import type { GraphData } from './graph.js';

export interface InvestigationOptions {
  /** Target wallet address */
  address: string;
  /** BFS depth (default: 2) */
  depth: number;
  /** Max counterparties per node (default: 10) */
  width: number;
  /** Blockchain chain (default: ethereum) */
  chain: string;
  /** Include OSINT via web search */
  osint: boolean;
  /** Skip disk cache */
  noCache: boolean;
  /** Output file path for HTML */
  output?: string;
  /** Minimum transfer volume to include edge (USD) */
  minVolume: number;
}

export interface InvestigationResult {
  /** Compiled graph data */
  graph: GraphData;
  /** Output HTML file path */
  outputPath: string;
  /** Investigation options used */
  options: InvestigationOptions;
}

export interface ProfileResult {
  address: string;
  labels: string[];
  sm_labels: string[];
  balance_usd: number;
  pnl_30d: number;
  defi_protocols: number;
  top_tokens: { symbol: string; value_usd: number }[];
  counterparty_count: number;
  osint?: { title: string; url: string; snippet: string }[];
}

export const DEFAULT_OPTIONS: InvestigationOptions = {
  address: '',
  depth: 2,
  width: 10,
  chain: 'ethereum',
  osint: false,
  noCache: false,
  minVolume: 0,
};
