#!/usr/bin/env node

/**
 * RedString — Forensic Wallet Investigation Engine
 *
 * "Map the Cabal. Zero Setup. One Command."
 *
 * Built for the Nansen CLI Build Challenge (Week 4).
 *
 * Usage:
 *   redstring investigate <address> [options]
 *   redstring compare <address-a> <address-b>
 *   redstring profile <address>
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createInvestigateCommand } from './commands/investigate.js';
import { createCompareCommand } from './commands/compare.js';
import { createProfileCommand } from './commands/profile.js';

const program = new Command();

program
  .name('redstring')
  .description(chalk.red.bold('REDSTRING') + chalk.gray(' — Forensic Wallet Investigation Engine'))
  .version('1.0.0')
  .addCommand(createInvestigateCommand())
  .addCommand(createCompareCommand())
  .addCommand(createProfileCommand());

program.parse(process.argv);
