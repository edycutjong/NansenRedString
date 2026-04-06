/**
 * Wallet profile types — raw API response shapes from Nansen CLI.
 */

export interface WalletLabel {
  label: string;
  tag?: string;
  category?: string;
}

export interface WalletBalance {
  total_usd: number;
  tokens: BalanceToken[];
}

export interface BalanceToken {
  symbol: string;
  amount: number;
  value_usd: number;
  chain?: string;
}

export interface PnlSummary {
  realized_pnl_usd: number;
  unrealized_pnl_usd: number;
  total_pnl_usd: number;
  period_days: number;
  win_rate?: number;
  total_trades?: number;
}

export interface TraceConnection {
  address: string;
  volume_usd: number;
  tx_count: number;
  direction: 'in' | 'out' | 'both';
  first_tx?: string;
  last_tx?: string;
}

export interface CounterpartyResult {
  address: string;
  volume_usd: number;
  tx_count: number;
  label?: string;
  direction: 'in' | 'out' | 'both';
}

export interface RelatedWallet {
  address: string;
  relationship: string;
  confidence: number;
  shared_labels?: string[];
}

export interface DefiPosition {
  protocol: string;
  type: string;
  value_usd: number;
  chain: string;
}

export interface CompareResult {
  address_a: string;
  address_b: string;
  common_counterparties: number;
  common_tokens: number;
  correlation_score: number;
  shared_labels: string[];
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}
