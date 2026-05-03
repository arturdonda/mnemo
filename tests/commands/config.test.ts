import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir } from 'node:fs/promises';

describe('config module', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `xctx-config-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		vi.resetModules();
		vi.doMock('node:os', () => ({ homedir: () => tempDir }));
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await rm(tempDir, { recursive: true, force: true });
	});

	it('readConfig returns defaults when no config file exists', async () => {
		const { readConfig, CONFIG_DEFAULTS } = await import('../../src/core/config.js');
		const config = await readConfig();
		expect(config['embedding.provider']).toBe(CONFIG_DEFAULTS['embedding.provider']);
		expect(config.watch).toBe(false);
	});

	it('setConfigValue persists and getConfigValue retrieves', async () => {
		const { setConfigValue, getConfigValue } = await import('../../src/core/config.js');
		await setConfigValue('embedding.provider', 'ollama');
		const value = await getConfigValue('embedding.provider');
		expect(value).toBe('ollama');
	});

	it('setConfigValue coerces boolean strings', async () => {
		const { setConfigValue, getConfigValue } = await import('../../src/core/config.js');
		await setConfigValue('watch', 'true');
		expect(await getConfigValue('watch')).toBe(true);
		await setConfigValue('watch', 'false');
		expect(await getConfigValue('watch')).toBe(false);
	});

	it('getConfigValue returns undefined for unknown key', async () => {
		const { getConfigValue } = await import('../../src/core/config.js');
		expect(await getConfigValue('unknown.key')).toBeUndefined();
	});

	it('setConfigValue throws for unknown key', async () => {
		const { setConfigValue } = await import('../../src/core/config.js');
		await expect(setConfigValue('unknown.key', 'val')).rejects.toThrow('Unknown config key');
	});

	it('setConfigValue merges with existing config', async () => {
		const { setConfigValue, readConfig } = await import('../../src/core/config.js');
		await setConfigValue('embedding.provider', 'ollama');
		await setConfigValue('embedding.model', 'nomic-embed-text');
		const config = await readConfig();
		expect(config['embedding.provider']).toBe('ollama');
		expect(config['embedding.model']).toBe('nomic-embed-text');
	});
});
