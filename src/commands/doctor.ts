import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { resolveProjectId } from '../core/project.js';
import { getPaths } from '../core/paths.js';
import { GraphStore } from '../core/graph/store.js';
import { MODELS_DIR } from '../core/models/download.js';
import { readConfig } from '../core/config.js';

type CheckResult = { label: string; ok: boolean; detail?: string; fix?: string };

export function createDoctorCommand(): Command {
	return new Command('doctor')
		.description('Diagnose common setup issues with actionable fixes')
		.action(async () => {
			const checks: CheckResult[] = [];

			// 1. Node.js version ≥ 20
			const nodeVersion = process.versions.node;
			const [nodeMajor] = nodeVersion.split('.').map(Number);
			checks.push({
				label: `Node.js v${nodeVersion}`,
				ok: nodeMajor >= 20,
				fix: nodeMajor < 20 ? 'Upgrade Node.js to v20 or later: https://nodejs.org' : undefined,
			});

			// 2. git available
			let gitVersion: string | undefined;
			try {
				const git = simpleGit();
				const raw = await git.raw(['--version']);
				gitVersion = raw.trim().replace('git version ', '');
				checks.push({ label: `git ${gitVersion}`, ok: true });
			} catch {
				checks.push({ label: 'git', ok: false, fix: 'Install git: https://git-scm.com' });
			}

			// 3. project initialized
			let projectId: string | undefined;
			let initialized = false;
			try {
				projectId = await resolveProjectId(process.cwd());
				const paths = getPaths(projectId);
				initialized = existsSync(paths.projectMeta);
				checks.push({
					label: `Project initialized${initialized && projectId ? ` (id: ${projectId})` : ''}`,
					ok: initialized,
					fix: initialized ? undefined : 'Run `xctx init` to initialize this project',
				});
			} catch {
				checks.push({ label: 'Project initialized', ok: false, fix: 'Run `xctx init` in a git repository' });
			}

			// 4. ONNX runtime loadable + model downloaded
			const config = await readConfig();
			if (config['embedding.provider'] === 'onnx') {
				// check native module loads correctly before checking the model file
				let onnxLoadable = true;
				try {
					await import('onnxruntime-node');
				} catch (err: unknown) {
					onnxLoadable = false;
					const msg = err instanceof Error ? err.message : String(err);
					const isNativeError = msg.includes('self-register') || msg.includes('.node') || msg.includes('MODULE_NOT_FOUND');
					checks.push({
						label: 'ONNX runtime (onnxruntime-node)',
						ok: false,
						detail: msg.slice(0, 120),
						fix: isNativeError
							? 'onnxruntime-node native binary is incompatible with this OS/Node version.\n  Switch to Ollama: xctx config set embedding.provider ollama\n  Then pull a model: ollama pull nomic-embed-text\n  Or use OpenAI:   xctx config set embedding.provider openai'
							: 'Reinstall dependencies: npm install -g cross-context',
					});
				}

				if (onnxLoadable) {
					checks.push({ label: 'ONNX runtime (onnxruntime-node)', ok: true });

					const modelPath = join(MODELS_DIR, 'all-MiniLM-L6-v2.onnx');
					const modelExists = existsSync(modelPath);
					checks.push({
						label: 'ONNX model (all-MiniLM-L6-v2)',
						ok: modelExists,
						fix: modelExists ? undefined : 'Run `xctx update` to download automatically',
					});
				}
			} else if (config['embedding.provider'] === 'ollama') {
				// check Ollama reachable
				try {
					const res = await fetch(`${config['embedding.ollamaUrl']}/api/tags`);
					checks.push({ label: `Ollama reachable (${config['embedding.ollamaUrl']})`, ok: res.ok });
				} catch {
					checks.push({
						label: `Ollama reachable (${config['embedding.ollamaUrl']})`,
						ok: false,
						fix: 'Start Ollama or update `xctx config set embedding.ollamaUrl <url>`',
					});
				}
			}

			// 5. Graph index health
			if (initialized && projectId) {
				const graphPaths = getPaths(projectId);
				if (existsSync(graphPaths.graphDb)) {
					try {
						const graphStore = new GraphStore(graphPaths.graphDb);
						const edgeCount = graphStore.countEdges();
						graphStore.close();
						checks.push({
							label: `Graph index (${edgeCount.toLocaleString('en-US')} edges)`,
							ok: edgeCount > 0,
							fix: edgeCount === 0 ? 'Run `xctx update` to populate the dependency graph.' : undefined,
						});
					} catch {
						checks.push({ label: 'Graph index', ok: false, fix: 'Run `xctx update` to rebuild the graph.' });
					}
				} else {
					checks.push({ label: 'Graph index', ok: false, fix: 'Run `xctx update` to build the dependency graph.' });
				}
			}

			// 6. Git hook installed
			const cwd = process.cwd();
			const hookPath = join(cwd, '.git', 'hooks', 'post-commit');
			const hookInstalled = existsSync(hookPath);
			checks.push({
				label: 'Git hook installed (.git/hooks/post-commit)',
				ok: hookInstalled,
				fix: hookInstalled ? undefined : 'Run `xctx init` to reinstall hooks',
			});

			// print results
			let hasFailures = false;
			for (const c of checks) {
				const icon = c.ok ? '✓' : '✗';
				console.log(`${icon} ${c.label}`);
				if (!c.ok) {
					hasFailures = true;
					if (c.fix) console.log(`  Fix: ${c.fix}`);
				}
			}

			if (!hasFailures) {
				console.log('\nAll checks passed.');
			}
		});
}
