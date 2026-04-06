/**
 * OSINT — Off-chain intelligence gathering via Nansen web search.
 * Optional enrichment layer activated by --osint flag.
 */

import { fetchWebSearch } from './nansen.js';

export interface OsintResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

/**
 * Search for off-chain intelligence about a wallet address.
 */
export async function gatherOsint(address: string): Promise<OsintResult[]> {
  const result = await fetchWebSearch(address);

  if (!result.success || !result.data) return [];

  const data = result.data as any[];
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    title: item.title || 'Unknown',
    url: item.url || '',
    snippet: item.snippet || '',
    source: item.source || 'web',
  }));
}
