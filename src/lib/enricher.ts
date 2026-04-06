/**
 * Node Enricher — fetches labels, balance, PnL, and DeFi data for a wallet.
 *
 * Called by graph-builder.ts during the enrichment phase after BFS traversal.
 * Leverages disk cache to avoid duplicate API calls across runs.
 */

import { fetchProfilerLabels, fetchProfilerBalance, fetchPnlSummary, fetchPortfolioDefi } from './nansen.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichedNodeData {
  labels: string[];
  sm_labels: string[];
  balance_usd: number;
  pnl_30d: number;
  defi_protocols: number;
}

// ---------------------------------------------------------------------------
// Smart Money detection keywords
// ---------------------------------------------------------------------------

const SM_KEYWORDS = ['smart money', 'fund', 'whale', 'pro trader', 'market maker', 'institutional', 'venture'];

// ---------------------------------------------------------------------------
// Core Enrichment
// ---------------------------------------------------------------------------

export async function enrichNode(address: string, chain = 'ethereum'): Promise<EnrichedNodeData> {
  const result: EnrichedNodeData = {
    labels: [],
    sm_labels: [],
    balance_usd: 0,
    pnl_30d: 0,
    defi_protocols: 0,
  };

  // Fetch all enrichment data in parallel (disk cache handles dedup)
  const [labelsRes, balanceRes, pnlRes, defiRes] = await Promise.all([
    fetchProfilerLabels(address, chain),
    fetchProfilerBalance(address, chain),
    fetchPnlSummary(address, chain),
    fetchPortfolioDefi(address, chain),
  ]);

  // Labels
  if (labelsRes.success && labelsRes.data) {
    const labels = labelsRes.data as any[];
    if (Array.isArray(labels)) {
      result.labels = labels.map((l: any) => l.label || l.name || String(l)).filter(Boolean);
      result.sm_labels = labels
        .filter((l: any) => {
          const combined = `${l.label || ''} ${l.tag || ''} ${l.category || ''}`.toLowerCase();
          return SM_KEYWORDS.some(kw => combined.includes(kw));
        })
        .map((l: any) => l.label || l.tag || 'Smart Money');
    }
  }

  // Balance
  if (balanceRes.success && balanceRes.data) {
    const balance = balanceRes.data as any;
    result.balance_usd = balance.total_usd || 0;
  }

  // PnL
  if (pnlRes.success && pnlRes.data) {
    const pnl = pnlRes.data as any;
    result.pnl_30d = pnl.total_pnl_usd || pnl.realized_pnl_usd || 0;
  }

  // DeFi
  if (defiRes.success && defiRes.data) {
    const defi = defiRes.data as any[];
    if (Array.isArray(defi)) {
      result.defi_protocols = defi.length;
    }
  }

  return result;
}
