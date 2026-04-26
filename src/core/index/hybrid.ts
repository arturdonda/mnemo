import { stat } from 'node:fs/promises';
import type { ScoredChunk } from './vector-store.js';
import { GraphStore } from '../graph/store.js';

export type HybridOptions = {
	graphStore: GraphStore;
	featLinkedFiles: string[];
};

export async function applyHybridScoring(results: ScoredChunk[], opts: HybridOptions): Promise<ScoredChunk[]> {
	if (results.length === 0) return results;

	const { graphStore, featLinkedFiles } = opts;

	// build hop-distance map from feat-linked files via BFS
	const hopMap = new Map<string, number>();
	const queue: Array<{ id: string; depth: number }> = featLinkedFiles.map((f) => ({ id: f, depth: 0 }));
	const seen = new Set<string>(featLinkedFiles);

	while (queue.length > 0) {
		const item = queue.shift()!;
		hopMap.set(item.id, item.depth);
		if (item.depth < 5) {
			const deps = graphStore.getDeps(item.id);
			for (const d of deps) {
				if (!seen.has(d)) {
					seen.add(d);
					queue.push({ id: d, depth: item.depth + 1 });
				}
			}
		}
	}

	const featFileSet = new Set(featLinkedFiles);

	// get mtimes for recency scoring
	const mtimes = await Promise.all(
		results.map(async (r) => {
			try {
				const s = await stat(r.filePath);
				return s.mtimeMs;
			} catch {
				return 0;
			}
		}),
	);

	const minMtime = Math.min(...mtimes);
	const maxMtime = Math.max(...mtimes);
	const mtimeRange = maxMtime - minMtime || 1;

	const scored = results.map((r, i) => {
		const semantic = r.score;

		const hops = hopMap.get(r.filePath);
		const graphProximity = hops !== undefined ? 1 / (hops + 1) : 0;

		const featRelevance = featFileSet.has(r.filePath) ? 1.0 : 0.0;

		const recency = (mtimes[i] - minMtime) / mtimeRange;

		const hybrid = 0.5 * semantic + 0.2 * graphProximity + 0.2 * featRelevance + 0.1 * recency;

		return { ...r, score: hybrid };
	});

	return scored.sort((a, b) => b.score - a.score);
}
