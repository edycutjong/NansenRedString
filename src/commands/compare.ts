/**
 * Compare Command — Compare two wallets head-to-head.
 *
 * Usage:
 *   redstring compare 0xAAA 0xBBB --chain ethereum
 */

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { fetchCompare } from '../lib/nansen.js';
import { printReceipt, resetLog } from '../lib/telemetry.js';

export function createCompareCommand(): Command {
  const cmd = new Command('compare')
    .description('Compare two wallets — shared counterparties, tokens, and correlation')
    .argument('<address-a>', 'First wallet address')
    .argument('<address-b>', 'Second wallet address')
    .option('-c, --chain <chain>', 'Blockchain network', 'ethereum')
    .option('--json', 'Output raw JSON')
    .action(async (addressA: string, addressB: string, opts: Record<string, any>) => {
      resetLog();

      console.log('');
      console.log(chalk.red.bold('[+] Comparing wallets...'));
      console.log(chalk.gray(`    A: ${addressA}`));
      console.log(chalk.gray(`    B: ${addressB}`));
      console.log('');

      const result = await fetchCompare(addressA, addressB, opts.chain);

      if (!result.success || !result.data) {
        console.log(chalk.red('  ✗ Compare failed: ' + (result.error || 'Unknown error')));
        process.exit(1);
      }

      const data = result.data as any;

      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      const lines = [
        chalk.red.bold('WALLET COMPARISON'),
        '',
        `${chalk.gray('Wallet A:')}      ${chalk.white(addressA.slice(0, 10) + '...')}`,
        `${chalk.gray('Wallet B:')}      ${chalk.white(addressB.slice(0, 10) + '...')}`,
        '',
        chalk.red('─'.repeat(44)),
        '',
        `${chalk.gray('Correlation:')}   ${correlationColor(data.correlation_score || 0)}`,
        `${chalk.gray('Common CPs:')}    ${chalk.white(String(data.common_counterparties || 0))}`,
        `${chalk.gray('Common Tokens:')} ${chalk.white(String(data.common_tokens || 0))}`,
      ];

      if (data.shared_labels && data.shared_labels.length > 0) {
        lines.push('');
        lines.push(`${chalk.gray('Shared Labels:')} ${chalk.cyan(data.shared_labels.join(', '))}`);
      }

      console.log(boxen(lines.join('\n'), {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'red',
        title: '[ COMPARE ]',
        titleAlignment: 'center',
      }));

      printReceipt();
    });

  return cmd;
}

function correlationColor(score: number): string {
  const pct = `${(score * 100).toFixed(0)}%`;
  if (score >= 0.7) return chalk.red.bold(pct + ' HIGH');
  if (score >= 0.4) return chalk.yellow(pct + ' MEDIUM');
  return chalk.green(pct + ' LOW');
}
