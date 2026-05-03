import { Command } from 'commander';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveProjectId, assertInitialized } from '../core/project.js';
import { getPaths } from '../core/paths.js';
import { listFeats, readEvents, buildContext } from '../core/feat/store.js';
import { renderContext } from '../core/feat/renderer.js';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { FeatureMeta } from '../core/feat/types.js';
import { handleError } from '../core/error.js';

export function createExportCommand(): Command {
	const exp = new Command('export').description('Export Cross Context data to external formats');

	exp
		.command('obsidian')
		.description('Export all feat contexts as an Obsidian vault')
		.option('--output <dir>', 'Output directory', '.xctx-obsidian')
		.action(async (opts: { output: string }) => {
			try {
				const projectId = await resolveProjectId(process.cwd());
				await assertInitialized(projectId);

				const paths = getPaths(projectId);
				const feats = await listFeats(projectId);
				const outDir = join(process.cwd(), opts.output);

				await mkdir(outDir, { recursive: true });

				if (feats.length === 0) {
					console.log('No features to export.');
					return;
				}

				for (const feat of feats) {
					let content: string;

					if (existsSync(paths.contextFile(feat.name))) {
						content = await readFile(paths.contextFile(feat.name), 'utf-8');
					} else {
						const events = await readEvents(projectId, feat.name);
						const metaRaw = await readFile(paths.featMeta(feat.name), 'utf-8');
						const meta = JSON.parse(metaRaw) as FeatureMeta;
						const ctx = buildContext(events, meta);
						content = renderContext(ctx);
					}

					// add wiki-links to other feat names at the bottom
					const otherFeats = feats.filter((f) => f.name !== feat.name);
					if (otherFeats.length > 0) {
						const links = otherFeats.map((f) => `[[${f.name}]]`).join('  ');
						content = content.trimEnd() + `\n\n## Related Features\n\n${links}\n`;
					}

					const fileName = `${feat.name}.md`;
					await writeFile(join(outDir, fileName), content, 'utf-8');
					console.log(`  ${fileName}`);
				}

				console.log(`\nExported ${feats.length} feat(s) to ${outDir}`);
			} catch (e) {
				handleError(e);
			}
		});

	return exp;
}
