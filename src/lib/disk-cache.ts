/**
 * Disk Cache — SHA256-keyed persistent cache for Nansen API responses.
 *
 * Stores JSON responses as files at ~/.redstring/cache/<sha256>.json
 * with per-endpoint TTLs to balance freshness vs. API cost.
 *
 * This is the core cost-saving mechanism: a full BFS trace costs $3-8
 * on first run, and $0 on every subsequent run within TTL.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CACHE_DIR = join(homedir(), '.redstring', 'cache');

/** TTLs per endpoint category (in milliseconds) */
const TTL_MAP: Record<string, number> = {
  'profiler labels':       7 * 24 * 60 * 60 * 1000,  // 7 days
  'profiler balance':      1 * 60 * 60 * 1000,        // 1 hour
  'profiler pnl-summary':  6 * 60 * 60 * 1000,        // 6 hours
  'profiler trace':        24 * 60 * 60 * 1000,        // 24 hours
  'profiler counterparties': 24 * 60 * 60 * 1000,      // 24 hours
  'profiler related-wallets': 7 * 24 * 60 * 60 * 1000, // 7 days
  'profiler compare':      24 * 60 * 60 * 1000,        // 24 hours
  'portfolio defi':        6 * 60 * 60 * 1000,         // 6 hours
  'profiler transactions': 1 * 60 * 60 * 1000,         // 1 hour
  'smart-money netflow':   1 * 60 * 60 * 1000,         // 1 hour
  'token info':            24 * 60 * 60 * 1000,        // 24 hours
  'web search':            7 * 24 * 60 * 60 * 1000,    // 7 days
};

const DEFAULT_TTL = 6 * 60 * 60 * 1000; // 6 hours

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Generate SHA256 hash for a cache key.
 */
export function getCacheKey(command: string, args: string[]): string {
  const raw = `${command}|${args.join('|')}`;
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Get the TTL for a given endpoint command.
 */
export function getTTL(command: string): number {
  for (const [pattern, ttl] of Object.entries(TTL_MAP)) {
    if (command.includes(pattern)) return ttl;
  }
  return DEFAULT_TTL;
}

/**
 * Retrieve a cached response, or null if miss/expired.
 */
export function getCached<T = unknown>(command: string, args: string[]): T | null {
  ensureCacheDir();
  const key = getCacheKey(command, args);
  const filePath = join(CACHE_DIR, `${key}.json`);

  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const entry = JSON.parse(raw) as { data: T; timestamp: number; command: string };
    const ttl = getTTL(command);
    const age = Date.now() - entry.timestamp;

    if (age > ttl) return null; // expired
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Store a response in the disk cache.
 */
export function setCache<T = unknown>(command: string, args: string[], data: T): void {
  ensureCacheDir();
  const key = getCacheKey(command, args);
  const filePath = join(CACHE_DIR, `${key}.json`);

  const entry = {
    data,
    timestamp: Date.now(),
    command: `${command} ${args.join(' ')}`.trim(),
  };

  writeFileSync(filePath, JSON.stringify(entry, null, 2));
}

/**
 * Clear all cached entries.
 */
export function clearCache(): { cleared: number } {
  ensureCacheDir();
  const files = readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    rmSync(join(CACHE_DIR, f));
  }
  return { cleared: files.length };
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): {
  entries: number;
  size_bytes: number;
  oldest_ms: number;
  newest_ms: number;
  dir: string;
} {
  ensureCacheDir();
  const files = readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
  let totalSize = 0;
  let oldest = Date.now();
  let newest = 0;

  for (const f of files) {
    const stat = statSync(join(CACHE_DIR, f));
    totalSize += stat.size;
    if (stat.mtimeMs < oldest) oldest = stat.mtimeMs;
    if (stat.mtimeMs > newest) newest = stat.mtimeMs;
  }

  return {
    entries: files.length,
    size_bytes: totalSize,
    oldest_ms: files.length > 0 ? oldest : 0,
    newest_ms: files.length > 0 ? newest : 0,
    dir: CACHE_DIR,
  };
}

/**
 * Get the cache directory path.
 */
export function getCacheDir(): string {
  return CACHE_DIR;
}
