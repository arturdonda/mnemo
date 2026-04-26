import type { FeatureContext } from './types.js';

function formatDate(ts: number): string {
	return new Date(ts).toISOString().slice(0, 10);
}

export function renderContext(context: FeatureContext): string {
	const { meta, files, decisions, blockers, notes, currentStatus } = context;
	const lines: string[] = [];

	lines.push(`# FEAT: ${meta.name}`);
	lines.push('');

	if (meta.branch) lines.push(`**Branch:** ${meta.branch}`);
	lines.push(`**Status:** ${meta.status}`);
	lines.push(
		`**Started:** ${formatDate(meta.createdAt)} | **Last updated:** ${formatDate(meta.updatedAt)}`,
	);
	lines.push('');

	lines.push('## Relevant Files');
	lines.push('');
	if (files.length === 0) {
		lines.push('_No files linked._');
	} else {
		for (const f of files) {
			lines.push(f.reason ? `- \`${f.path}\` — ${f.reason}` : `- \`${f.path}\``);
		}
	}
	lines.push('');

	lines.push('## Decisions');
	lines.push('');
	if (decisions.length === 0) {
		lines.push('_No decisions recorded._');
	} else {
		for (const d of decisions) {
			lines.push(`- ${formatDate(d.ts)}: ${d.text}`);
		}
	}
	lines.push('');

	lines.push('## Current Status');
	lines.push('');
	lines.push(currentStatus ?? '_No status update yet._');
	lines.push('');

	const activeBlockers = blockers.filter((b) => !b.resolved);
	const resolvedBlockers = blockers.filter((b) => b.resolved);

	lines.push('## Blockers');
	lines.push('');
	if (activeBlockers.length === 0) {
		lines.push('None active.');
	} else {
		for (const b of activeBlockers) {
			lines.push(`- ${b.text}`);
		}
	}
	lines.push('');

	if (resolvedBlockers.length > 0) {
		lines.push('## Resolved Blockers');
		lines.push('');
		for (const b of resolvedBlockers) {
			lines.push(`- ${b.text}`);
		}
		lines.push('');
	}

	if (notes.length > 0) {
		lines.push('## Notes');
		lines.push('');
		for (const n of notes) {
			lines.push(`- ${formatDate(n.ts)}: ${n.text}`);
		}
		lines.push('');
	}

	return lines.join('\n');
}
