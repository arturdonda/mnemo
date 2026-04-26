import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

export type ParsedFile = {
	filePath: string;
	imports: string[];
	exports: string[];
	functions: string[];
	classes: string[];
};

const PARSERS: Record<string, (content: string, filePath: string) => ParsedFile> = {
	'.ts': parseTsJs,
	'.tsx': parseTsJs,
	'.js': parseTsJs,
	'.mjs': parseTsJs,
	'.jsx': parseTsJs,
	'.py': parsePython,
	'.go': parseGo,
	'.rs': parseRust,
	'.java': parseJava,
	'.cs': parseCSharp,
};

export async function parseFile(filePath: string): Promise<ParsedFile> {
	const ext = extname(filePath).toLowerCase();
	const parser = PARSERS[ext] ?? parseRegexFallback;

	const content = await readFile(filePath, 'utf-8');
	return parser(content, filePath);
}

function parseTsJs(content: string, filePath: string): ParsedFile {
	const imports: string[] = [];
	const exports: string[] = [];
	const functions: string[] = [];
	const classes: string[] = [];

	for (const line of content.split('\n')) {
		const t = line.trim();

		// imports: import ... from '...'  |  require('...')
		const importMatch = t.match(/^import\s+.*?from\s+['"]([^'"]+)['"]/);
		if (importMatch) imports.push(importMatch[1]);

		const requireMatch = t.match(/require\(['"]([^'"]+)['"]\)/);
		if (requireMatch) imports.push(requireMatch[1]);

		// exports
		if (/^export\s+(default\s+)?(function|class|const|let|var|async\s+function)/.test(t)) {
			const nameMatch = t.match(/(?:function|class)\s+(\w+)/);
			if (nameMatch) exports.push(nameMatch[1]);
			else {
				const constMatch = t.match(/(?:const|let|var)\s+(\w+)/);
				if (constMatch) exports.push(constMatch[1]);
			}
		}
		if (/^export\s+\{/.test(t)) {
			const names = t.match(/\w+/g)?.filter((w) => w !== 'export' && w !== 'as' && w !== 'default') ?? [];
			exports.push(...names);
		}

		// functions
		const fnMatch = t.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)/);
		if (fnMatch) functions.push(fnMatch[1]);
		const arrowMatch = t.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
		if (arrowMatch) functions.push(arrowMatch[1]);

		// classes
		const classMatch = t.match(/^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
		if (classMatch) classes.push(classMatch[1]);
	}

	return { filePath, imports: [...new Set(imports)], exports: [...new Set(exports)], functions: [...new Set(functions)], classes: [...new Set(classes)] };
}

function parsePython(content: string, filePath: string): ParsedFile {
	const imports: string[] = [];
	const functions: string[] = [];
	const classes: string[] = [];

	for (const line of content.split('\n')) {
		const t = line.trim();
		const impMatch = t.match(/^(?:from\s+(\S+)\s+)?import\s+(.+)/);
		if (impMatch) imports.push(impMatch[1] ?? impMatch[2].split(',')[0].trim());

		const fnMatch = t.match(/^def\s+(\w+)/);
		if (fnMatch) functions.push(fnMatch[1]);

		const clsMatch = t.match(/^class\s+(\w+)/);
		if (clsMatch) classes.push(clsMatch[1]);
	}

	return { filePath, imports: [...new Set(imports)], exports: [], functions: [...new Set(functions)], classes: [...new Set(classes)] };
}

function parseGo(content: string, filePath: string): ParsedFile {
	const imports: string[] = [];
	const functions: string[] = [];

	for (const line of content.split('\n')) {
		const t = line.trim();
		const impMatch = t.match(/^"([^"]+)"/);
		if (impMatch) imports.push(impMatch[1]);
		const fnMatch = t.match(/^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/);
		if (fnMatch) functions.push(fnMatch[1]);
	}

	return { filePath, imports: [...new Set(imports)], exports: [], functions: [...new Set(functions)], classes: [] };
}

function parseRust(content: string, filePath: string): ParsedFile {
	const imports: string[] = [];
	const functions: string[] = [];

	for (const line of content.split('\n')) {
		const t = line.trim();
		const useMatch = t.match(/^use\s+([^;{]+)/);
		if (useMatch) imports.push(useMatch[1].trim());
		const fnMatch = t.match(/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
		if (fnMatch) functions.push(fnMatch[1]);
	}

	return { filePath, imports: [...new Set(imports)], exports: [], functions: [...new Set(functions)], classes: [] };
}

function parseJava(content: string, filePath: string): ParsedFile {
	const imports: string[] = [];
	const functions: string[] = [];
	const classes: string[] = [];

	for (const line of content.split('\n')) {
		const t = line.trim();
		const impMatch = t.match(/^import\s+([^;]+);/);
		if (impMatch) imports.push(impMatch[1]);
		const clsMatch = t.match(/^(?:public\s+)?(?:abstract\s+)?class\s+(\w+)/);
		if (clsMatch) classes.push(clsMatch[1]);
		const fnMatch = t.match(/^(?:public|private|protected|static|\s)+\w+\s+(\w+)\s*\(/);
		if (fnMatch) functions.push(fnMatch[1]);
	}

	return { filePath, imports: [...new Set(imports)], exports: [], functions: [...new Set(functions)], classes: [...new Set(classes)] };
}

function parseCSharp(content: string, filePath: string): ParsedFile {
	const imports: string[] = [];
	const functions: string[] = [];
	const classes: string[] = [];

	for (const line of content.split('\n')) {
		const t = line.trim();
		const impMatch = t.match(/^using\s+([^;]+);/);
		if (impMatch) imports.push(impMatch[1]);
		const clsMatch = t.match(/^(?:public|private|internal|protected|abstract|sealed|\s)*class\s+(\w+)/);
		if (clsMatch) classes.push(clsMatch[1]);
		const fnMatch = t.match(/^(?:public|private|protected|static|override|virtual|async|\s)+\w+\s+(\w+)\s*\(/);
		if (fnMatch) functions.push(fnMatch[1]);
	}

	return { filePath, imports: [...new Set(imports)], exports: [], functions: [...new Set(functions)], classes: [...new Set(classes)] };
}

function parseRegexFallback(content: string, filePath: string): ParsedFile {
	const imports: string[] = [];
	for (const line of content.split('\n')) {
		const m = line.match(/(?:import|require|include|use|from)\s+['"]?([^\s'"]+)['"]?/);
		if (m) imports.push(m[1]);
	}
	return { filePath, imports: [...new Set(imports)], exports: [], functions: [], classes: [] };
}
