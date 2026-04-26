import { Command } from 'commander';

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize Mnemo for this project')
    .action(async () => {
      console.log('Not implemented yet.');
    });
}
