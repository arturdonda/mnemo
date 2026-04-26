import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';

export type MnemoConfig = {
	'embedding.provider': 'onnx' | 'ollama' | 'openai';
	'embedding.model': string;
	'vector-store': 'sqlite' | 'lancedb';
	'embedding.ollamaUrl': string;
	'embedding.openaiKey': string;
	watch: boolean;
};

const DEFAULTS: MnemoConfig = {
	'embedding.provider': 'onnx',
	'embedding.model': 'all-MiniLM-L6-v2',
	'vector-store': 'sqlite' as const,
	'embedding.ollamaUrl': 'http://localhost:11434',
	'embedding.openaiKey': '',
	watch: false,
};

function configPath(): string {
	return join(homedir(), '.mnemo', 'config.json');
}

export async function readConfig(): Promise<MnemoConfig> {
	const path = configPath();
	if (!existsSync(path)) return { ...DEFAULTS };
	const raw = await readFile(path, 'utf-8');
	return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<MnemoConfig>) };
}

export async function writeConfig(config: MnemoConfig): Promise<void> {
	const path = configPath();
	await mkdir(join(homedir(), '.mnemo'), { recursive: true });
	await writeFile(path, JSON.stringify(config, null, 2), 'utf-8');
}

export async function getConfigValue(key: string): Promise<unknown> {
	const config = await readConfig();
	if (!(key in config)) return undefined;
	return config[key as keyof MnemoConfig];
}

export async function setConfigValue(key: string, value: string): Promise<void> {
	const config = await readConfig();
	if (!(key in DEFAULTS)) {
		throw new Error(`Unknown config key: "${key}"`);
	}

	const defaultVal = DEFAULTS[key as keyof MnemoConfig];
	if (typeof defaultVal === 'boolean') {
		(config as Record<string, unknown>)[key] = value === 'true';
	} else {
		(config as Record<string, unknown>)[key] = value;
	}

	await writeConfig(config);
}

export { DEFAULTS as CONFIG_DEFAULTS };
