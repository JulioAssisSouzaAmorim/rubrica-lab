export const MAX_FILE_BYTES = 512 * 1024;

const SECRETS = [
  ['chave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['chave de acesso AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['token do GitHub', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['chave de API', /\bsk-[A-Za-z0-9_-]{32,}\b/],
];

const CONTENT_RULES = [
  ['marcador de conflito', () => true, /^(<{7}|>{7}|={7})( |$)/m],
  ['teste focado (.only)', (path) => /\.(test|spec)\.[jt]sx?$/.test(path), /\b(?:it|test|describe)\.only\(/],
  ['debugger esquecido', (path) => /\.[jt]sx?$|\.mjs$/.test(path), /^\s*debugger;?\s*$/m],
];

/**
 * Inspects staged files (path, size and text) for things that should never be committed.
 * @param {{ path: string, size: number, text: string | null }[]} files
 */
export function findProblems(files) {
  const problems = [];
  for (const { path, size, text } of files) {
    if (size > MAX_FILE_BYTES) {
      problems.push(
        `${path}: arquivo com ${Math.ceil(size / 1024)} KB (limite ${MAX_FILE_BYTES / 1024} KB).`,
      );
    }
    if (text === null) continue;
    for (const [label, pattern] of SECRETS) {
      if (pattern.test(text)) problems.push(`${path}: possível ${label}.`);
    }
    for (const [label, applies, pattern] of CONTENT_RULES) {
      if (applies(path) && pattern.test(text)) problems.push(`${path}: ${label}.`);
    }
  }
  return problems;
}
