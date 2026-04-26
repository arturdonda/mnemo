#!/usr/bin/env node
import { Command } from 'commander';
import { createFeatCommand } from './commands/feat.js';
import { createInitCommand } from './commands/init.js';
import { createInstallCommand } from './commands/install.js';
import { createConfigCommand } from './commands/config.js';

const program = new Command();

program
  .name('mnemo')
  .description('Your codebase, remembered — across every AI session.')
  .version('0.1.0');

program.addCommand(createInitCommand());
program.addCommand(createFeatCommand());
program.addCommand(createInstallCommand());
program.addCommand(createConfigCommand());

program.parse();
