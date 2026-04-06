/**
 * Profile Command — Generate a deep profile for a single wallet.
 *
 * Usage:
 *   redstring profile 0xdead... --chain ethereum
 *
 * Displays: labels, balance, PnL, DeFi positions, transactions
 */

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { fetchProfilerLabels, fetchProfilerBalance, fetchPnlSummary, fetchPortfolioDefi, fetchTransactions } from '../lib/nansen.js';
import { printReceipt, resetLog } from '../lib/telemetry.js';

export function createProfileCommand(): Command {
  const cmd = new Command('profile')
    .description('Deep profile a wallet — labels, balance, PnL, DeFi, and transactions')
    .argument('<address>', 'Wallet address')
    .option('-c, --chain <chain>', 'Blockchain network', 'ethereum')
    .option('--json', 'Output raw JSON')
    .action(async (address: string, opts: Record<string, any>) => {
      resetLog();

      console.log('');
      console.log(chalk.red.bold(`[+] Profiling ${address.slice(0, 10)}...`));
      console.log('');

      // Fetch all data in parallel
      const [labelsRes, balanceRes, pnlRes, defiRes, txRes] = await Promise.all([
        fetchProfilerLabels(address, opts.chain),
        fetchProfilerBalance(address, opts.chain),
        fetchPnlSummary(address, opts.chain),
        fetchPortfolioDefi(address, opts.chain),
        fetchTransactions(address, opts.chain, 5),
      ]);

      if (opts.json) {
        console.log(JSON.stringify({
          labels: labelsRes.data,
          balance: balanceRes.data,
          pnl: pnlRes.data,
          defi: defiRes.data,
          transactions: txRes.data,
        }, null, 2));
        return;
      }

      // Labels
      const labels = (labelsRes.success && Array.isArray(labelsRes.data))
        ? (labelsRes.data as any[]).map((l: any) => l.label || l.name).filter(Boolean)
        : [];

      // Balance
      const balance = (balanceRes.success && balanceRes.data) ? (balanceRes.data as any) : { total_usd: 0, tokens: [] };

      // PnL
      const pnl = (pnlRes.success && pnlRes.data) ? (pnlRes.data as any) : { total_pnl_usd: 0, win_rate: 0, total_trades: 0 };

      // Profile box
      const lines = [
        chalk.red.bold('WALLET PROFILE'),
        '',
        `${chalk.gray('Address:')}  ${chalk.white(address)}`,
        `${chalk.gray('Chain:')}    ${chalk.white(opts.chain)}`,
        `${chalk.gray('Labels:')}   ${labels.length > 0 ? chalk.cyan(labels.join(', ')) : chalk.gray('None')}`,
        '',
        chalk.red('─'.repeat(50)),
        '',
        `${chalk.gray('Balance:')}  ${chalk.yellow('$' + (balance.total_usd || 0).toLocaleString())}`,
        `${chalk.gray('PnL 30d:')} ${pnl.total_pnl_usd >= 0 ? chalk.green('+$' + (pnl.total_pnl_usd || 0).toLocaleString()) : chalk.red('-$' + Math.abs(pnl.total_pnl_usd || 0).toLocaleString())}`,
        `${chalk.gray('Win Rate:')} ${chalk.white(((pnl.win_rate || 0) * 100).toFixed(0) + '%')}`,
        `${chalk.gray('Trades:')}   ${chalk.white(String(pnl.total_trades || 0))}`,
      ];

      // DeFi positions
      if (defiRes.success && Array.isArray(defiRes.data) && defiRes.data.length > 0) {
        lines.push('');
        lines.push(chalk.red('─'.repeat(50)));
        lines.push('');
        lines.push(chalk.gray('DeFi Positions:'));
        for (const pos of (defiRes.data as any[]).slice(0, 5)) {
          lines.push(`  ${chalk.cyan(pos.protocol.padEnd(20))} ${chalk.yellow('$' + (pos.value_usd || 0).toLocaleString())} ${chalk.gray(pos.type || '')}`);
        }
      }

      // Top tokens
      if (balance.tokens && balance.tokens.length > 0) {
        lines.push('');
        lines.push(chalk.red('─'.repeat(50)));
        lines.push('');
        lines.push(chalk.gray('Top Holdings:'));
        for (const token of balance.tokens.slice(0, 5)) {
          lines.push(`  ${chalk.white((token.symbol || '???').padEnd(8))} ${chalk.yellow('$' + (token.value_usd || 0).toLocaleString())} ${chalk.gray(String(token.amount || 0))}`);
        }
      }

      console.log(boxen(lines.join('\n'), {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'red',
        title: '[ PROFILE ]',
        titleAlignment: 'center',
      }));

      printReceipt();
    });

  return cmd;
}
