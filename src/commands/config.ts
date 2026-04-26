import { Command } from 'commander';

export function createConfigCommand(): Command {
  return new Command('config')
    .description('Get or set Mnemo configuration values')
    .action(async () => {
      console.log('Not implemented yet.');
    });
}
