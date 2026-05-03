import { Command } from 'commander';
import { rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MODELS_DIR, MANIFEST_PATH, readManifest, downloadModel } from '../core/models/download.js';
import { handleError } from '../core/error.js';

const KNOWN_MODELS: Record<string, { url: string; description: string }> = {
	'all-MiniLM-L6-v2': {
		url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx',
		description: 'Sentence embeddings, 384 dims (default)',
	},
};

export function createModelsCommand(): Command {
	const models = new Command('models').description('Manage locally cached embedding models');

	models
		.command('list')
		.description('Show installed models and their status')
		.action(async () => {
			try {
				const manifest = await readManifest();
				const entries = Object.values(manifest.models);

				if (entries.length === 0) {
					console.log('No models installed. Run `xctx update` to download the default model.');
					return;
				}

				for (const m of entries) {
					const size = m.sizeBytes ? `${(m.sizeBytes / 1024 / 1024).toFixed(1)}MB` : '?';
					const date = new Date(m.downloadedAt).toISOString().slice(0, 10);
					console.log(`${m.name}`);
					console.log(`  file:       ${m.fileName}`);
					console.log(`  size:       ${size}`);
					console.log(`  sha256:     ${m.sha256.slice(0, 16)}...`);
					console.log(`  downloaded: ${date}`);
				}
			} catch (e) {
				handleError(e);
			}
		});

	models
		.command('download <name>')
		.description('Download a model by name')
		.action(async (name: string) => {
			try {
				const known = KNOWN_MODELS[name];
				if (!known) {
					const available = Object.keys(KNOWN_MODELS).join(', ');
					console.error(`Unknown model "${name}". Available: ${available}`);
					process.exitCode = 1;
					return;
				}
				const dest = join(MODELS_DIR, `${name}.onnx`);
				await downloadModel(name, known.url, dest);
				console.log(`Model ready: ${name}`);
			} catch (e) {
				handleError(e);
			}
		});

	models
		.command('remove <name>')
		.description('Remove a cached model')
		.action(async (name: string) => {
			try {
				const manifest = await readManifest();
				const entry = manifest.models[name];
				if (!entry) {
					console.error(`Model "${name}" is not installed.`);
					process.exitCode = 1;
					return;
				}
				const dest = join(MODELS_DIR, entry.fileName);
				if (existsSync(dest)) await rm(dest, { force: true });
				delete manifest.models[name];
				const { writeFile } = await import('node:fs/promises');
				await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
				console.log(`Removed: ${name}`);
			} catch (e) {
				handleError(e);
			}
		});

	return models;
}
