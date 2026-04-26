import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { createMcpServer } from '../../src/integrations/mcp/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

let tempDir: string;
let originalCwd: string;

beforeAll(async () => {
	tempDir = join(tmpdir(), `mnemo-e2e-mcp-${Date.now()}`);
	await mkdir(tempDir, { recursive: true });
	originalCwd = process.cwd();
	process.chdir(tempDir);

	// init a minimal mnemo project directory so resolveProjectId works
	const { getPaths } = await import('../../src/core/paths.js');
	const { resolveProjectId } = await import('../../src/core/project.js');
	const projectId = await resolveProjectId(tempDir);
	const paths = getPaths(projectId);
	await mkdir(paths.projectRoot, { recursive: true });
	await writeFile(paths.projectMeta, JSON.stringify({ id: projectId, name: 'test', createdAt: Date.now() }), 'utf-8');

	// create a feature
	const { ensurePaths, getPaths: gp2 } = await import('../../src/core/paths.js');
	await ensurePaths(projectId, 'test-feat');
	const { appendEvent } = await import('../../src/core/feat/store.js');
	const now = Date.now();
	const meta = { id: 'test-feat', name: 'test-feat', status: 'in-progress', createdAt: now, updatedAt: now };
	const p = gp2(projectId);
	await writeFile(p.featMeta('test-feat'), JSON.stringify(meta, null, 2), 'utf-8');
	await appendEvent(projectId, 'test-feat', { ts: now, type: 'feat_created', text: 'test-feat' });
	await appendEvent(projectId, 'test-feat', { ts: now, type: 'decision', text: 'Use TypeScript for type safety.', author: 'user' });

	const { setActiveFeat } = await import('../../src/core/feat/active.js');
	await setActiveFeat(projectId, 'test-feat');
});

afterAll(async () => {
	process.chdir(originalCwd);
	await rm(tempDir, { recursive: true, force: true });
});

describe('MCP flow — server tools', () => {
	it('get_feat_context returns current feat markdown', async () => {
		const server = createMcpServer();
		const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

		await server.connect(serverTransport);

		const client = new Client({ name: 'test-client', version: '0.0.1' });
		await client.connect(clientTransport);

		const result = await client.callTool({ name: 'get_feat_context', arguments: {} });

		expect(result.content).toBeDefined();
		const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
		expect(text).toContain('test-feat');

		await client.close();
	});

	it('record_decision appends a decision event', async () => {
		const server = createMcpServer();
		const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

		await server.connect(serverTransport);

		const client = new Client({ name: 'test-client', version: '0.0.1' });
		await client.connect(clientTransport);

		const result = await client.callTool({
			name: 'record_decision',
			arguments: { text: 'Use SQLite for local storage.' },
		});

		const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
		expect(text).toContain('Decision recorded');

		await client.close();
	});
});
