/**
 * Terminal Report — Hollywood-style investigation summary for the CLI.
 *
 * Prints a formatted terminal report with the forensic investigation results
 * using chalk + boxen for that Palantir terminal aesthetic.
 */

import chalk from 'chalk';
import boxen from 'boxen';
import type { GraphData } from '../types/graph.js';

// ---------------------------------------------------------------------------
// Terminal Report
// ---------------------------------------------------------------------------

export function printTerminalReport(graph: GraphData): void {
  const { nodes, links, meta } = graph;

  // Hollywood loading sequence (already happened during trace)
  console.log('');

  // Investigation Summary Box
  const summaryLines = [
    chalk.red.bold('🔍 INVESTIGATION COMPLETE'),
    '',
    `${chalk.gray('Target:')}    ${chalk.white.bold(meta.seed)}`,
    `${chalk.gray('Chain:')}     ${chalk.white(meta.chain)}`,
    `${chalk.gray('Depth:')}     ${chalk.white(String(meta.depth))}`,
    `${chalk.gray('Duration:')}  ${chalk.white(formatDuration(meta.duration_ms))}`,
    '',
    chalk.red('─'.repeat(50)),
    '',
    `${chalk.gray('Nodes:')}     ${chalk.white.bold(String(meta.total_nodes))} wallets discovered`,
    `${chalk.gray('Edges:')}     ${chalk.white.bold(String(meta.total_edges))} connections mapped`,
    `${chalk.gray('Smart $:')}   ${chalk.yellow.bold(String(meta.smart_money_count))} Smart Money wallets`,
    `${chalk.gray('Labeled:')}   ${chalk.green.bold(String(meta.labeled_count))} identified entities`,
    `${chalk.gray('Unknown:')}   ${chalk.blue(String(meta.total_nodes - meta.smart_money_count - meta.labeled_count - 1))} unidentified`,
    '',
    chalk.red('─'.repeat(50)),
    '',
    `${chalk.gray('API Calls:')}  ${chalk.white(String(meta.api_calls))}`,
    `${chalk.gray('Cache Hits:')} ${chalk.green(String(meta.cache_hits))}`,
    `${chalk.gray('Cost Est:')}   ${chalk.white('$' + ((meta.api_calls - meta.cache_hits) * 0.05).toFixed(2))}`,
  ];

  console.log(boxen(summaryLines.join('\n'), {
    padding: 1,
    borderStyle: 'double',
    borderColor: 'red',
    title: '[ REDSTRING ]',
    titleAlignment: 'center',
  }));

  // Top Nodes by Balance
  const topNodes = [...nodes]
    .sort((a, b) => b.balance_usd - a.balance_usd)
    .slice(0, 5);

  if (topNodes.length > 0) {
    console.log('');
    console.log(chalk.red.bold('  💰 TOP WALLETS BY BALANCE'));
    console.log(chalk.gray('  ' + '─'.repeat(60)));
    for (const node of topNodes) {
      const typeIcon = getNodeIcon(node.type);
      const formattedBalance = formatUSD(node.balance_usd);
      const label = node.label.length > 30 ? node.label.slice(0, 27) + '...' : node.label;
      console.log(`  ${typeIcon} ${chalk.white(label.padEnd(32))} ${chalk.yellow(formattedBalance.padStart(14))}  ${chalk.gray(`PnL: ${formatUSD(node.pnl_30d)}`)}`);
    }
  }

  // Smart Money Cluster
  const smNodes = nodes.filter(n => n.type === 'smart-money');
  if (smNodes.length > 0) {
    console.log('');
    console.log(chalk.yellow.bold('  🟡 SMART MONEY CLUSTER'));
    console.log(chalk.gray('  ' + '─'.repeat(60)));
    for (const node of smNodes.slice(0, 5)) {
      const smLabel = node.sm_labels.join(', ') || 'Smart Money';
      console.log(`  ${chalk.yellow('●')} ${chalk.white(node.label.padEnd(32))} ${chalk.gray(smLabel)}`);
    }
  }

  // High-volume edges
  const topEdges = [...links]
    .sort((a, b) => b.volume_usd - a.volume_usd)
    .slice(0, 5);

  if (topEdges.length > 0) {
    console.log('');
    console.log(chalk.red.bold('  🔗 STRONGEST CONNECTIONS'));
    console.log(chalk.gray('  ' + '─'.repeat(60)));
    for (const edge of topEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const arrow = edge.direction === 'inflow' ? '←' : edge.direction === 'outflow' ? '→' : '↔';
      const sourceLabel = sourceNode?.label || truncate(edge.source, 10);
      const targetLabel = targetNode?.label || truncate(edge.target, 10);
      console.log(`  ${chalk.white(sourceLabel.padEnd(18))} ${chalk.red(arrow)} ${chalk.white(targetLabel.padEnd(18))} ${chalk.yellow(formatUSD(edge.volume_usd).padStart(14))}  ${chalk.gray(`${edge.tx_count} txs`)}`);
    }
  }

  console.log('');
}

// ---------------------------------------------------------------------------
// Log Sequence (Hollywood hacking aesthetic)
// ---------------------------------------------------------------------------

export function printLogLine(icon: string, message: string, color: 'red' | 'green' | 'yellow' | 'white' | 'cyan' = 'white'): void {
  const colorFn = chalk[color];
  console.log(colorFn(`[${icon}] ${message}`));
}

export function printHollywoodStart(address: string): void {
  console.log('');
  printLogLine('+', `Target locked: ${address.slice(0, 6)}...${address.slice(-4)}`, 'red');
}

export function printBfsProgress(depth: number, maxDepth: number, nodesFound: number): void {
  printLogLine('+', `Executing BFS Traversal (Depth ${depth}/${maxDepth})...`, 'white');
  if (nodesFound > 0) {
    printLogLine('!', `${nodesFound} new wallets discovered at depth ${depth}`, 'yellow');
  }
}

export function printEnrichmentProgress(count: number): void {
  printLogLine('+', `Enriching ${count} nodes with DeFi PnL and Labels...`, 'white');
}

export function printSmCluster(count: number): void {
  if (count > 0) {
    printLogLine('!', `Smart Money cluster detected: ${count} wallets`, 'yellow');
  }
}

export function printCompileStart(): void {
  printLogLine('+', 'Compiling WebGL Matrix...', 'cyan');
}

export function printLaunchSuccess(outputPath: string): void {
  printLogLine('✓', `Cabal mapped. Launching visualizer...`, 'green');
  console.log(chalk.gray(`    → ${outputPath}`));
  console.log('');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNodeIcon(type: string): string {
  switch (type) {
    case 'seed': return chalk.red('●');
    case 'smart-money': return chalk.yellow('●');
    case 'labeled': return chalk.cyan('●');
    case 'contract': return chalk.gray('●');
    default: return chalk.blue('●');
  }
}

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 3) + '...';
}
