import { Command } from 'commander';

export function createFeatCommand(): Command {
  const feat = new Command('feat').description('Manage feature contexts');

  feat
    .command('start <name>')
    .description('Start a new feature context and set it as active')
    .action(async (_name, _opts) => {
      console.log('Not implemented yet.');
    });

  feat
    .command('list')
    .description('List all feature contexts for this project')
    .action(async () => {
      console.log('Not implemented yet.');
    });

  feat
    .command('switch <name>')
    .description('Switch the active feature context')
    .action(async (_name) => {
      console.log('Not implemented yet.');
    });

  feat
    .command('context [name]')
    .description('Print the context for the active (or named) feature')
    .action(async (_name) => {
      console.log('Not implemented yet.');
    });

  feat
    .command('decision <text>')
    .description('Record an architectural decision')
    .option('--feat <name>', 'Target feature (defaults to active)')
    .action(async (_text, _opts) => {
      console.log('Not implemented yet.');
    });

  feat
    .command('blocker')
    .description('Record or resolve a blocker')
    .addCommand(
      new Command('resolve')
        .argument('<text>', 'Substring matching the blocker to resolve')
        .action(async (_text) => {
          console.log('Not implemented yet.');
        })
    )
    .argument('[text]', 'Blocker description')
    .action(async (_text) => {
      console.log('Not implemented yet.');
    });

  feat
    .command('link-file <path>')
    .description('Link a file to the active feature context')
    .option('--reason <text>', 'Why this file is relevant')
    .action(async (_path, _opts) => {
      console.log('Not implemented yet.');
    });

  feat
    .command('unlink-file <path>')
    .description('Unlink a file from the active feature context')
    .action(async (_path) => {
      console.log('Not implemented yet.');
    });

  feat
    .command('status <text>')
    .description('Update the current status of the active feature')
    .action(async (_text) => {
      console.log('Not implemented yet.');
    });

  feat
    .command('note <text>')
    .description('Add a note to the active feature context')
    .action(async (_text) => {
      console.log('Not implemented yet.');
    });

  feat
    .command('done')
    .description('Mark the active feature as done')
    .action(async () => {
      console.log('Not implemented yet.');
    });

  return feat;
}
