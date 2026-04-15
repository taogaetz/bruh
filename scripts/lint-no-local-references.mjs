import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = process.cwd();
const ALLOWED_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.mts',
  '.cts',
  '.svelte',
  '.json',
  '.md',
  '.html',
  '.css',
  '.scss',
  '.yml',
  '.yaml',
  '.txt'
]);
const ALLOWED_BASENAMES = new Set(['README', 'LICENSE']);
const IGNORED_PATH_SEGMENTS = new Set(['node_modules', 'build', '.svelte-kit', '.git']);
const IGNORED_FILES = new Set(['package-lock.json', 'scripts/lint-no-local-references.mjs']);

const patterns = [
  {
    label: 'localhost hostname',
    regex: /\blocalhost\b/gi
  },
  {
    label: 'local/private IPv4 address',
    regex: /\b(?:127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|0\.0\.0\.0)\b/g
  },
  {
    label: 'Unix local filesystem path',
    regex: /(?:^|[^\w])((?:file:\/\/)?\/(?:home|Users|private|tmp|var\/folders)\/[^\s'"`<>]*)/g
  },
  {
    label: 'Windows local filesystem path',
    regex: /\b([A-Za-z]:\\[^\s'"`<>]+)/g
  },
  {
    label: 'Docker host shortcut',
    regex: /\bhost\.docker\.internal\b/g
  }
];

function isScannable(filePath) {
  if (IGNORED_FILES.has(filePath) || IGNORED_FILES.has(path.basename(filePath))) return false;
  const segments = filePath.split('/');
  if (segments.some((segment) => IGNORED_PATH_SEGMENTS.has(segment))) return false;

  const ext = path.extname(filePath);
  if (ALLOWED_EXTENSIONS.has(ext)) return true;

  const base = path.basename(filePath, ext);
  return ALLOWED_BASENAMES.has(base);
}

function getFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
      cwd: repoRoot,
      encoding: 'utf8'
    });

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter(isScannable);
  } catch (error) {
    console.error('Failed to enumerate repo files for local-reference lint.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function getLineNumber(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source[i] === '\n') line += 1;
  }
  return line;
}

const violations = [];

for (const relativePath of getFiles()) {
  const absolutePath = path.join(repoRoot, relativePath);
  let source;

  try {
    source = fs.readFileSync(absolutePath, 'utf8');
  } catch (error) {
    console.error(`Failed to read ${relativePath} during local-reference lint.`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  for (const pattern of patterns) {
    const matches = source.matchAll(pattern.regex);

    for (const match of matches) {
      const rawIndex = match.index ?? 0;
      const value = match[1] ?? match[0].trim();
      const start = match[1] ? rawIndex + match[0].indexOf(match[1]) : rawIndex;

      violations.push({
        file: relativePath,
        line: getLineNumber(source, start),
        label: pattern.label,
        value
      });
    }
  }
}

if (violations.length > 0) {
  console.error('Local-only references detected. Remove them before shipping code.');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} [${violation.label}] ${violation.value}`);
  }
  process.exit(1);
}

console.log('No local IPs or filesystem paths detected in tracked text files.');
