#!/usr/bin/env node
import { Command } from 'commander';
import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { createFeatCommand } from './commands/feat.js';
import { createInitCommand } from './commands/init.js';
import { createInstallCommand } from './commands/install.js';
import { createConfigCommand } from './commands/config.js';
import { createUpdateCommand } from './commands/update.js';
import { createSearchCommand } from './commands/search.js';
import { createStatusCommand } from './commands/status.js';
import { createGraphCommand } from './commands/graph.js';
import { createMcpCommand } from './commands/mcp.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const program = new Command();

program
  .name('mnemo')
  .description('Your codebase, remembered — across every AI session.')
  .version(version);

program.addCommand(createInitCommand());
program.addCommand(createFeatCommand());
program.addCommand(createInstallCommand());
program.addCommand(createConfigCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createSearchCommand());
program.addCommand(createStatusCommand());
program.addCommand(createGraphCommand());
program.addCommand(createMcpCommand());

program.parse();
