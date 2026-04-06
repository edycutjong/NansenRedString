/**
 * Investigate Command — the core RedString CLI action.
 *
 * Usage:
 *   redstring investigate 0xdead... --depth 2 --width 10 --chain ethereum
 *
 * Flow:
 *   1. Hollywood log sequence (target locked, BFS traversal...)
 *   2. BFS graph build + enrichment
 *   3. Terminal report (Palantir aesthetic)
 *   4. Compile self-contained WebGL HTML
 *   5. Auto-open in default browser
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import open from 'open';
import type { InvestigationOptions } from '../types/investigation.js';
import { buildGraph } from '../lib/graph-builder.js';
import { renderGraph } from '../lib/html-renderer.js';
import { printTerminalReport, printHollywoodStart, printCompileStart, printLaunchSuccess } from '../lib/terminal-report.js';
import { gatherOsint } from '../lib/osint.js';
import { printReceipt, resetLog } from '../lib/telemetry.js';
import { checkNansenInstalled } from '../lib/nansen.js';
import { IS_MOCK } from '../lib/mock.js';

export function createInvestigateCommand(): Command {
  const cmd = new Command('investigate')
    .description('Trace a wallet through the on-chain network and map its connections')
    .argument('<address>', 'Target wallet address or ENS name')
    .option('-d, --depth <number>', 'BFS traversal depth (1-3)', '2')
    .option('-w, --width <number>', 'Max counterparties per node (5-20)', '10')
    .option('-c, --chain <chain>', 'Blockchain network', 'ethereum')
    .option('-m, --min-volume <number>', 'Min USD volume filter for edges', '0')
    .option('--osint', 'Include off-chain intelligence (web search)', false)
    .option('--no-open', 'Skip auto-opening browser')
    .option('--no-cache', 'Bypass disk cache (live API only)')
    .option('-o, --output <dir>', 'Output directory for HTML file')
    .option('--json', 'Output raw graph JSON to stdout')
    .action(async (address: string, opts: Record<string, any>) => {
      // Pre-flight check
      if (!IS_MOCK) {
        const installed = await checkNansenInstalled();
        if (!installed) {
          console.log(boxen(
            chalk.red.bold('Nansen CLI not found\n\n') +
            chalk.white('Install it with:\n') +
            chalk.cyan('  npm install -g @nansen/cli\n\n') +
            chalk.gray('Or run in mock mode:\n') +
            chalk.cyan('  NANSEN_MOCK=true redstring investigate 0x...'),
            { padding: 1, borderStyle: 'double', borderColor: 'red' }
          ));
          process.exit(1);
        }
      }

      // Parse options
      const options: InvestigationOptions = {
        address: address,
        depth: Math.min(3, Math.max(1, parseInt(opts.depth) || 2)),
        width: Math.min(20, Math.max(5, parseInt(opts.width) || 10)),
        chain: opts.chain || 'ethereum',
        minVolume: parseInt(opts.minVolume) || 0,
        osint: opts.osint || false,
        noCache: !opts.cache,
      };

      // Reset telemetry for this investigation
      resetLog();

      // --- Hollywood Log Sequence ---
      printHollywoodStart(address);

      // BFS Traversal
      const spinner = ora({
        text: chalk.white('Executing BFS Traversal...'),
        color: 'red',
        spinner: 'dots12',
      }).start();

      let graph!: Awaited<ReturnType<typeof buildGraph>>;
      try {
        graph = await buildGraph(options);
        spinner.succeed(chalk.green(`BFS complete: ${graph.nodes.length} nodes, ${graph.links.length} edges`));
      } catch (err) {
        spinner.fail(chalk.red('BFS Traversal failed'));
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      // OSINT enrichment (optional)
      if (options.osint) {
        const osintSpinner = ora({
          text: chalk.white('Gathering off-chain intelligence...'),
          color: 'yellow',
          spinner: 'dots12',
        }).start();

        try {
          const osintResults = await gatherOsint(address);
          if (osintResults.length > 0) {
            osintSpinner.succeed(chalk.green(`${osintResults.length} OSINT sources found`));
            // Attach OSINT to meta for display
            (graph.meta as any).osint = osintResults;
          } else {
            osintSpinner.info(chalk.gray('No OSINT results'));
          }
        } catch {
          osintSpinner.warn(chalk.yellow('OSINT failed (non-critical)'));
        }
      }

      // JSON output mode
      if (opts.json) {
        console.log(JSON.stringify(graph, null, 2));
        return;
      }

      // Terminal Report
      printTerminalReport(graph);

      // Compile HTML
      printCompileStart();
      const outputPath = renderGraph(graph, opts.output);

      // Telemetry Receipt
      printReceipt();

      // Launch browser
      if (opts.open !== false) {
        printLaunchSuccess(outputPath);
        await open(outputPath);
      } else {
        console.log(chalk.gray(`  Output: ${outputPath}`));
      }
    });

  return cmd;
}
