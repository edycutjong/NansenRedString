/**
 * Nansen CLI Wrapper — executed via child_process.execFile.
 *
 * Supports three data modes:
 *  - NANSEN_MOCK=true  → synthetic data (works offline, no API)
 *  - (default)         → live Nansen CLI API with disk cache
 *
 * Integrates with disk-cache.ts for transparent API cost reduction.
 * A full BFS trace costs $3-8 on first run and $0 on cached runs.
 */

import { execFile } from 'node:child_process';
import { IS_MOCK, getMockData } from './mock.js';
import { recordCall, classifyRole } from './telemetry.js';
import { getCached, setCache } from './disk-cache.js';

// ---------------------------------------------------------------------------
// Core Types
// ---------------------------------------------------------------------------

export interface NansenResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  status?: number;
}

// ---------------------------------------------------------------------------
// API Call Counter
// ---------------------------------------------------------------------------

let apiCallCount = 0;

export function getApiCallCount(): number {
  return apiCallCount;
}

export function resetApiCallCount(): void {
  apiCallCount = 0;
}

// ---------------------------------------------------------------------------
// Core Executor
// ---------------------------------------------------------------------------

export function execNansen<T = unknown>(
  command: string,
  args: string[] = [],
  options: { timeout?: number; noCache?: boolean } = {},
): Promise<NansenResponse<T>> {
  apiCallCount++;
  const { timeout = 60_000, noCache = false } = options;
  const fullCommand = `${command} ${args.join(' ')}`.trim();
  const role = classifyRole(fullCommand);
  const startTime = Date.now();

  // Mock mode — return synthetic data without CLI call
  if (IS_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mock = getMockData(command, args);
        const latency = Date.now() - startTime;
        if (mock !== null) {
          recordCall({ endpoint: command, method: 'EXEC', latency_ms: latency, status: 'SUCCESS', cache: 'N/A', role });
          resolve({ success: true, data: mock as T });
        } else {
          recordCall({ endpoint: command, method: 'EXEC', latency_ms: latency, status: 'ERROR', cache: 'N/A', role });
          resolve({ success: false, error: '[MOCK] No data for: ' + command });
        }
      }, 50);
    });
  }

  // Disk cache check (unless bypassed)
  if (!noCache) {
    const cached = getCached<T>(command, args);
    if (cached !== null) {
      const latency = Date.now() - startTime;
      recordCall({ endpoint: command, method: 'EXEC', latency_ms: latency, status: 'SUCCESS', cache: 'HIT', role });
      return Promise.resolve({ success: true, data: cached });
    }
  }

  // Live CLI execution
  return new Promise((resolve) => {
    const fullArgs = [...command.split(' '), ...args, '--pretty'];

    execFile(
      'nansen',
      fullArgs,
      { maxBuffer: 10 * 1024 * 1024, timeout },
      (error, stdout, stderr) => {
        const latency = Date.now() - startTime;
        if (error) {
          const errorText = stderr || stdout || error.message;
          recordCall({ endpoint: command, method: 'EXEC', latency_ms: latency, status: 'ERROR', cache: 'MISS', role });

          if (process.env.NANSEN_DEBUG) {
            console.error(`\n[DEBUG] API Error in ${command}: ${errorText.slice(0, 200)}`);
          }
          try {
            const parsed = JSON.parse(errorText);
            resolve({
              success: false,
              error: parsed.error || error.message,
              code: parsed.code,
              status: parsed.status,
            });
          } catch {
            resolve({
              success: false,
              error: errorText.slice(0, 500),
              code: 'EXEC_ERROR',
            });
          }
          return;
        }

        try {
          const parsed = JSON.parse(stdout);

          // Unwrap nested data wrapper
          if (parsed.success && parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data) && 'data' in parsed.data) {
            parsed.data = parsed.data.data;
          }

          // Cache the successful response
          if (parsed.success && parsed.data !== undefined) {
            setCache(command, args, parsed.data);
          }

          recordCall({ endpoint: command, method: 'EXEC', latency_ms: latency, status: '200', cache: 'MISS', role });
          resolve(parsed as NansenResponse<T>);
        } catch {
          recordCall({ endpoint: command, method: 'EXEC', latency_ms: latency, status: 'ERROR', cache: 'MISS', role });
          if (process.env.NANSEN_DEBUG) {
            console.error(`\n[DEBUG] Parse Error in ${command}: Failed to parse JSON\n${stdout.slice(0, 200)}`);
          }
          resolve({
            success: false,
            error: `Failed to parse JSON: ${stdout.slice(0, 200)}`,
            code: 'PARSE_ERROR',
          });
        }
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Profiler Wrappers (Forensic Investigation)
// ---------------------------------------------------------------------------

/** Trace wallet connections — the core BFS data source */
export async function fetchProfilerTrace(address: string, chain = 'ethereum', opts: { depth?: number; width?: number; days?: number; noCache?: boolean } = {}) {
  const { depth = 2, width = 10, days = 30, noCache = false } = opts;
  return execNansen('research profiler trace', [
    '--address', address,
    '--chain', chain,
    '--depth', String(depth),
    '--width', String(width),
    '--days', String(days),
  ], { noCache });
}

/** Get counterparties for a wallet — BFS supplement/fallback */
export async function fetchCounterparties(address: string, chain = 'ethereum', limit = 10, noCache = false) {
  return execNansen('research profiler counterparties', [
    '--address', address,
    '--chain', chain,
    '--limit', String(limit),
  ], { noCache });
}

/** Discover related wallets (funding sources, common counterparties) */
export async function fetchRelatedWallets(address: string, chain = 'ethereum', noCache = false) {
  return execNansen('research profiler related-wallets', [
    '--address', address,
    '--chain', chain,
  ], { noCache });
}

/** Compare two wallets side-by-side */
export async function fetchCompare(addressA: string, addressB: string, chain = 'ethereum') {
  return execNansen('research profiler compare', [
    '--addresses', `${addressA},${addressB}`,
    '--chain', chain,
  ]);
}

/** Get Nansen entity labels for an address */
export async function fetchProfilerLabels(address: string, chain = 'ethereum') {
  return execNansen('research profiler labels', [
    '--address', address,
    '--chain', chain,
  ]);
}

/** Get wallet balance */
export async function fetchProfilerBalance(address: string, chain = 'ethereum') {
  return execNansen('research profiler balance', [
    '--address', address,
    '--chain', chain,
  ]);
}

/** Get PnL summary */
export async function fetchPnlSummary(address: string, chain = 'ethereum') {
  return execNansen('research profiler pnl-summary', [
    '--address', address,
    '--chain', chain,
  ]);
}

/** Get transaction history */
export async function fetchTransactions(address: string, chain = 'ethereum', limit = 20) {
  return execNansen('research profiler transactions', [
    '--address', address,
    '--chain', chain,
    '--limit', String(limit),
  ]);
}

// ---------------------------------------------------------------------------
// Portfolio Wrappers
// ---------------------------------------------------------------------------

/** Get DeFi positions for a wallet */
export async function fetchPortfolioDefi(address: string, chain = 'ethereum') {
  return execNansen('research portfolio defi', [
    '--address', address,
    '--chain', chain,
  ]);
}

// ---------------------------------------------------------------------------
// Smart Money Wrappers
// ---------------------------------------------------------------------------

/** Smart money netflow (chain-level context overlay) */
export async function fetchSmartMoneyNetflow(chain: string, limit = 20) {
  return execNansen('research smart-money netflow', [
    '--chain', chain,
    '--limit', String(limit),
  ]);
}

// ---------------------------------------------------------------------------
// Token Wrappers
// ---------------------------------------------------------------------------

/** Token info (metadata + price) */
export async function fetchTokenInfo(symbol: string) {
  return execNansen('research token info', [
    '--symbol', symbol,
  ]);
}

/** Who bought/sold a token */
export async function fetchWhoBoughtSold(token: string, chain = 'ethereum', limit = 20) {
  return execNansen('research token who-bought-sold', [
    '--token', token,
    '--chain', chain,
    '--limit', String(limit),
  ]);
}

// ---------------------------------------------------------------------------
// OSINT (Off-chain Intelligence)
// ---------------------------------------------------------------------------

/** Web search for off-chain intelligence on an address */
export async function fetchWebSearch(query: string) {
  return execNansen('web search', [
    '--query', query,
  ]);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Check if nansen CLI is available */
export async function checkNansenInstalled(forceCheck = false): Promise<boolean> {
  if (IS_MOCK && !forceCheck) return true;
  return new Promise((resolve) => {
    execFile('nansen', ['--version'], { timeout: 5000 }, (error) => {
      resolve(!error);
    });
  });
}

/** Get account status (credits, plan) */
export async function fetchAccountStatus() {
  return execNansen('account');
}

/** Wallet show (status check) */
export async function fetchWalletShow(address: string) {
  return execNansen('wallet show', [
    '--address', address,
  ]);
}

/** Get CLI schema */
export async function fetchSchema() {
  return execNansen('schema');
}
