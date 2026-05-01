import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

export type MemoryEntry = {
	id: string;
	text: string;
	tags: string[];
	source: string; // 'manual' | 'agent' | 'feat:<name>'
	createdAt: number;
};

function makeId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function addMemory(filePath: string, entry: Omit<MemoryEntry, 'id' | 'createdAt'>): Promise<MemoryEntry> {
	await mkdir(dirname(filePath), { recursive: true });
	const mem: MemoryEntry = { id: makeId(), createdAt: Date.now(), ...entry };
	await appendFile(filePath, JSON.stringify(mem) + '\n', 'utf-8');
	return mem;
}

export async function listMemories(filePath: string): Promise<MemoryEntry[]> {
	if (!existsSync(filePath)) return [];
	const raw = await readFile(filePath, 'utf-8');
	return raw
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line) as MemoryEntry);
}

export async function removeMemory(filePath: string, id: string): Promise<boolean> {
	const entries = await listMemories(filePath);
	const filtered = entries.filter((e) => e.id !== id);
	if (filtered.length === entries.length) return false;
	const content = filtered.map((e) => JSON.stringify(e)).join('\n');
	await writeFile(filePath, filtered.length > 0 ? content + '\n' : '', 'utf-8');
	return true;
}

export async function searchMemories(filePath: string, query: string): Promise<MemoryEntry[]> {
	const entries = await listMemories(filePath);
	const q = query.toLowerCase();
	return entries.filter(
		(e) => e.text.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase().includes(q)),
	);
}
