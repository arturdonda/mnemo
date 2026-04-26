import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export const MODELS_DIR = join(homedir(), '.mnemo', 'models');
export const MANIFEST_PATH = join(MODELS_DIR, 'manifest.json');

export type ModelEntry = {
	name: string;
	fileName: string;
	url: string;
	sizeBytes: number;
	sha256: string;
	downloadedAt: number;
};

type Manifest = { models: Record<string, ModelEntry> };

export async function readManifest(): Promise<Manifest> {
	try {
		return JSON.parse(await readFile(MANIFEST_PATH, 'utf-8')) as Manifest;
	} catch {
		return { models: {} };
	}
}

async function writeManifest(manifest: Manifest): Promise<void> {
	await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

export async function downloadModel(name: string, url: string, dest: string): Promise<void> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);

	const total = Number(res.headers.get('content-length') ?? 0);
	let received = 0;
	const startTime = Date.now();

	const isTTY = process.stderr.isTTY;
	const label = `Model not found. Downloading ${name}`;
	if (isTTY) process.stderr.write(`${label}${total ? ` (${formatBytes(total)})` : ''}...\n`);
	else process.stderr.write(`${label}...\n`);

	const tempPath = `${dest}.tmp`;
	const fileStream = createWriteStream(tempPath);
	const hash = createHash('sha256');

	const body = res.body as ReadableStream<Uint8Array>;
	const reader = body.getReader();

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			hash.update(value);
			fileStream.write(value);
			received += value.length;

			if (isTTY && total > 0) {
				const pct = Math.floor((received / total) * 100);
				const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
				process.stderr.write(`\r  [${bar}] ${pct}% ${formatBytes(received)}/${formatBytes(total)}`);
			}
		}
	} finally {
		await new Promise<void>((resolve, reject) => fileStream.end((err: unknown) => (err ? reject(err) : resolve())));
	}

	if (isTTY) process.stderr.write('\n');

	const sha256 = hash.digest('hex');
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	process.stderr.write(`  Downloaded in ${elapsed}s  SHA256: ${sha256.slice(0, 16)}...\n`);

	// move temp → final
	await rm(dest, { force: true });
	const { rename } = await import('node:fs/promises');
	await rename(tempPath, dest);

	// record in manifest
	await mkdir(MODELS_DIR, { recursive: true });
	const manifest = await readManifest();
	manifest.models[name] = {
		name,
		fileName: basename(dest),
		url,
		sizeBytes: received,
		sha256,
		downloadedAt: Date.now(),
	};
	await writeManifest(manifest);
}

export async function verifyModel(dest: string, expectedSha256: string): Promise<boolean> {
	if (!expectedSha256) return true;
	const content = await readFile(dest);
	const actual = createHash('sha256').update(content).digest('hex');
	return actual === expectedSha256;
}

export async function ensureModel(name: string, url: string, dest: string): Promise<void> {
	await mkdir(MODELS_DIR, { recursive: true });

	if (!existsSync(dest)) {
		await downloadModel(name, url, dest);
		return;
	}

	// verify integrity against stored manifest hash
	const manifest = await readManifest();
	const entry = manifest.models[name];
	if (entry?.sha256) {
		const ok = await verifyModel(dest, entry.sha256);
		if (!ok) {
			process.stderr.write(`  Warning: ${name} checksum mismatch. Re-downloading...\n`);
			await rm(dest, { force: true });
			await downloadModel(name, url, dest);
		}
	}
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
