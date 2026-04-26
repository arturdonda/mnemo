import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { resolveProjectId } from '../core/project.js';
import { getPaths } from '../core/paths.js';
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
					fix: initialized ? undefined : 'Run `mnemo init` to initialize this project',
				});
			} catch {
				checks.push({ label: 'Project initialized', ok: false, fix: 'Run `mnemo init` in a git repository' });
			}

			// 4. ONNX model downloaded
			const config = await readConfig();
			if (config['embedding.provider'] === 'onnx') {
				const modelPath = join(MODELS_DIR, 'all-MiniLM-L6-v2.onnx');
				const modelExists = existsSync(modelPath);
				checks.push({
					label: 'ONNX model (all-MiniLM-L6-v2)',
					ok: modelExists,
					fix: modelExists ? undefined : 'Run `mnemo update` to download automatically',
				});
			} else if (config['embedding.provider'] === 'ollama') {
				// check Ollama reachable
				try {
					const res = await fetch(`${config['embedding.ollamaUrl']}/api/tags`);
					checks.push({ label: `Ollama reachable (${config['embedding.ollamaUrl']})`, ok: res.ok });
				} catch {
					checks.push({
						label: `Ollama reachable (${config['embedding.ollamaUrl']})`,
						ok: false,
						fix: 'Start Ollama or update `mnemo config set embedding.ollamaUrl <url>`',
					});
				}
			}

			// 5. Git hook installed
			const cwd = process.cwd();
			const hookPath = join(cwd, '.git', 'hooks', 'post-commit');
			const hookInstalled = existsSync(hookPath);
			checks.push({
				label: 'Git hook installed (.git/hooks/post-commit)',
				ok: hookInstalled,
				fix: hookInstalled ? undefined : 'Run `mnemo init` to reinstall hooks',
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
