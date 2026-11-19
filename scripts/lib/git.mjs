import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

export const stagedFiles = () =>
  git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').split('\0').filter(Boolean);

/** Reads the staged blob rather than the working tree, so partially staged files are judged correctly. */
export function stagedBlob(path) {
  const buffer = execFileSync('git', ['show', `:${path}`], { maxBuffer: 64 * 1024 * 1024 });
  const binary = buffer.subarray(0, 8000).includes(0);
  return { path, size: buffer.length, text: binary ? null : buffer.toString('utf8') };
}
