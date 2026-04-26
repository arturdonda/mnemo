import { Command } from 'commander';
import { readConfig, getConfigValue, setConfigValue, CONFIG_DEFAULTS } from '../core/config.js';
import { MnemoError, handleError } from '../core/error.js';

export function createConfigCommand(): Command {
	const config = new Command('config').description('Get or set Mnemo configuration values');

	config
		.command('get <key>')
		.description('Get a configuration value')
		.action(async (key: string) => {
			try {
				const value = await getConfigValue(key);
				if (value === undefined) throw new MnemoError(`Unknown config key: "${key}"`);
				console.log(String(value));
			} catch (e) {
				handleError(e);
			}
		});

	config
		.command('set <key> <value>')
		.description('Set a configuration value')
		.action(async (key: string, value: string) => {
			try {
				await setConfigValue(key, value);
				console.log(`Set ${key} = ${value}`);
			} catch (e) {
				handleError(e);
			}
		});

	config
		.command('list')
		.description('List all configuration values with defaults')
		.action(async () => {
			try {
				const current = await readConfig();
				for (const [key, defaultVal] of Object.entries(CONFIG_DEFAULTS)) {
					const val = current[key as keyof typeof current];
					const isDefault = val === defaultVal;
					const marker = isDefault ? '' : ' (modified)';
					console.log(`${key} = ${String(val)}${marker}`);
				}
			} catch (e) {
				handleError(e);
			}
		});

	return config;
}
