export type EventType =
	| 'feat_created'
	| 'decision'
	| 'blocker'
	| 'blocker_resolved'
	| 'file_linked'
	| 'file_unlinked'
	| 'status'
	| 'note'
	| 'feat_done';

export type FeatureEvent = {
	ts: number;
	type: EventType;
	text?: string;
	path?: string;
	reason?: string;
	author?: string;
};

export type FeatureMeta = {
	id: string;
	name: string;
	branch?: string;
	status: 'in-progress' | 'blocked' | 'done';
	createdAt: number;
	updatedAt: number;
};

export type FeatureContext = {
	meta: FeatureMeta;
	files: Array<{ path: string; reason?: string }>;
	decisions: Array<{ text: string; ts: number; author?: string }>;
	blockers: Array<{ text: string; resolved: boolean; ts: number }>;
	notes: Array<{ text: string; ts: number }>;
	currentStatus?: string;
};
