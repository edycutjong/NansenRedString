/**
 * Telemetry — Global API call tracker for RedString.
 * Ported from Oracle's telemetry.ts with forensic role classification.
 *
 * Records every Nansen CLI call with endpoint, latency, status, cache hit/miss,
 * and role classification. Prints a formatted receipt at end of each command.
 */

import chalk from 'chalk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TelemetryEntry {
  endpoint: string;
  method: 'GET' | 'EXEC';
  latency_ms: number;
  status: string;
  cache: 'HIT' | 'MISS' | 'N/A';
  role: string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const entries: TelemetryEntry[] = [];
let enabled = true;

export function recordCall(entry: TelemetryEntry): void {
  if (enabled) {
    entries.push(entry);
  }
}

export function getEntries(): TelemetryEntry[] {
  return [...entries];
}

export function getCallCount(): number {
  return entries.length;
}

export function getCacheHits(): number {
  return entries.filter(e => e.cache === 'HIT').length;
}

export function resetTelemetry(): void {
  entries.length = 0;
}

export function setTelemetryEnabled(value: boolean): void {
  enabled = value;
}

export function isTelemetryEnabled(): boolean {
  return enabled;
}

// ---------------------------------------------------------------------------
// Role Classification (Forensic-specific)
// ---------------------------------------------------------------------------

export function classifyRole(command: string): string {
  if (command.includes('trace')) return 'Traversal';
  if (command.includes('counterparties')) return 'Traversal';
  if (command.includes('related-wallets')) return 'Discovery';
  if (command.includes('compare')) return 'Comparison';
  if (command.includes('labels')) return 'Enrichment';
  if (command.includes('balance')) return 'Enrichment';
  if (command.includes('pnl-summary')) return 'Enrichment';
  if (command.includes('portfolio defi')) return 'Enrichment';
  if (command.includes('web search')) return 'OSINT';
  if (command.includes('smart-money')) return 'SM Analysis';
  if (command.includes('transactions')) return 'History';
  if (command.includes('token')) return 'Token Data';
  if (command.includes('wallet')) return 'Wallet Mgmt';
  if (command.includes('account')) return 'Account';
  if (command.includes('schema')) return 'Dev Tools';
  return 'Other';
}

// ---------------------------------------------------------------------------
// Receipt Formatter
// ---------------------------------------------------------------------------

export function printTelemetryReceipt(): void {
  const all = getEntries();
  if (all.length === 0) return;

  const width = 98;

  console.log('');
  console.log(chalk.red('┌' + '─'.repeat(width - 2) + '┐'));
  console.log(chalk.red('│') + chalk.red.bold(centerText('REDSTRING INVESTIGATION TELEMETRY', width - 2)) + chalk.red('│'));
  console.log(chalk.red('├' + '─'.repeat(width - 2) + '┤'));

  // Header
  const header =
    padEnd('Endpoint', 42) +
    padEnd('Method', 8) +
    padEnd('Latency', 10) +
    padEnd('Status', 10) +
    padEnd('Cache', 8) +
    padEnd('Role', 16);
  console.log(chalk.red('│') + ' ' + chalk.gray(header) + ' ' + chalk.red('│'));
  console.log(chalk.red('│') + ' ' + chalk.gray('─'.repeat(width - 4)) + ' ' + chalk.red('│'));

  for (const e of all) {
    const endpoint = e.endpoint.length > 40
      ? e.endpoint.slice(0, 37) + '...'
      : e.endpoint;
    const statusColor = e.status === '200' || e.status === 'SUCCESS'
      ? chalk.green
      : e.status === 'ERROR' ? chalk.red : chalk.yellow;
    const cacheColor = e.cache === 'HIT' ? chalk.green : chalk.gray;
    const latencyColor = e.latency_ms > 500 ? chalk.yellow : chalk.white;

    const row =
      padEnd(endpoint, 42) +
      padEnd(e.method, 8) +
      latencyColor(padEnd(`${e.latency_ms}ms`, 10)) +
      statusColor(padEnd(e.status, 10)) +
      cacheColor(padEnd(e.cache, 8)) +
      padEnd(e.role, 16);
    console.log(chalk.red('│') + ' ' + row + ' ' + chalk.red('│'));
  }

  // Summary
  const totalCalls = all.length;
  const avgLatency = Math.round(all.reduce((sum, e) => sum + e.latency_ms, 0) / totalCalls);
  const errorCount = all.filter(e => e.status === 'ERROR').length;
  const cacheHits = all.filter(e => e.cache === 'HIT').length;

  console.log(chalk.red('├' + '─'.repeat(width - 2) + '┤'));

  const summaryLine =
    `CALLS: ${chalk.white.bold(String(totalCalls))}` +
    `  |  AVG: ${chalk.white(avgLatency + 'ms')}` +
    `  |  CACHE: ${chalk.green(String(cacheHits))}` +
    `  |  ERRORS: ${errorCount > 0 ? chalk.red(String(errorCount)) : chalk.green('0')}`;

  // eslint-disable-next-line no-control-regex
  const rawSummary = summaryLine.replace(/\x1b\[[0-9;]*m/g, '');
  const summaryPadding = Math.max(0, width - 4 - rawSummary.length);
  console.log(chalk.red('│') + ' ' + summaryLine + ' '.repeat(summaryPadding) + ' ' + chalk.red('│'));
  console.log(chalk.red('└' + '─'.repeat(width - 2) + '┘'));
  console.log('');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function padEnd(str: string, length: number): string {
  return str.padEnd(length);
}

function centerText(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text + ' '.repeat(width - pad - text.length);
}

// ---------------------------------------------------------------------------
// Aliases (for ergonomic imports across commands)
// ---------------------------------------------------------------------------

export const printReceipt = printTelemetryReceipt;
export const resetLog = resetTelemetry;
