import { Command } from 'commander';

export function createInstallCommand(): Command {
  return new Command('install')
    .description('Install Mnemo integration for an AI agent')
    .argument('<agent>', 'Agent to integrate (e.g. claude)')
    .action(async (_agent) => {
      console.log('Not implemented yet.');
    });
}
