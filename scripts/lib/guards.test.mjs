import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findProblems, MAX_FILE_BYTES } from './guards.mjs';

// Fixtures are assembled at runtime so this file never trips the guards itself.
const file = (path, text, size = text?.length ?? 0) => ({ path, text, size });
const privateKey = ['-----BEGIN RSA', 'PRIVATE KEY-----'].join(' ');
const awsKey = 'AKIA' + 'ABCDEFGHIJKLMNOP';
const githubToken = 'ghp' + '_' + 'a'.repeat(36);
const conflict = ['<'.repeat(7) + ' HEAD', 'a', '='.repeat(7), 'b', '>'.repeat(7) + ' branch'].join('\n');
const focused = 'it' + '.only("x", () => {});';
const debuggerLine = '  ' + 'debug' + 'ger;';

describe('findProblems', () => {
  it('passes ordinary files', () => {
    assert.deepEqual(findProblems([file('src/a.ts', 'export const a = 1;')]), []);
  });

  it('flags oversized files, including binaries', () => {
    const [problem] = findProblems([file('big.png', null, MAX_FILE_BYTES + 1)]);
    assert.match(problem, /big\.png: arquivo com 513 KB/);
  });

  for (const [label, text] of [
    ['chave privada', privateKey],
    ['chave de acesso AWS', `key=${awsKey}`],
    ['token do GitHub', `token: ${githubToken}`],
  ]) {
    it(`detects ${label}`, () => {
      assert.deepEqual(findProblems([file('config.json', text)]), [`config.json: possível ${label}.`]);
    });
  }

  it('detects conflict markers anywhere', () => {
    assert.deepEqual(findProblems([file('README.md', conflict)]), ['README.md: marcador de conflito.']);
  });

  it('detects focused tests only in test files', () => {
    assert.equal(findProblems([file('web/src/App.test.tsx', focused)]).length, 1);
    assert.equal(findProblems([file('docs/guide.md', focused)]).length, 0);
  });

  it('detects leftover debugger statements in scripts', () => {
    assert.equal(findProblems([file('web/src/api.ts', `const a = 1;\n${debuggerLine}\n`)]).length, 1);
    assert.equal(findProblems([file('web/src/api.ts', 'const debuggerEnabled = true;')]).length, 0);
  });
});
