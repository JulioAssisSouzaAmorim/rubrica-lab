import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateCommitMessage } from './commit-message.mjs';

describe('validateCommitMessage', () => {
  for (const message of [
    'feat(engine): adiciona função teto()',
    'fix: corrige ordem de avaliação',
    'refactor(web)!: troca o gerenciador de estado',
    'docs: atualiza README\n\nExplica a DSL.',
    'chore: ajusta deps\n# comentário do git\n',
    'Merge branch main into feature',
    'fixup! feat: algo',
  ]) {
    it(`accepts "${message.split('\n')[0]}"`, () => {
      assert.deepEqual(validateCommitMessage(message), []);
    });
  }

  it('rejects unknown types', () => {
    assert.match(validateCommitMessage('feature: x')[0], /tipo\(escopo\)/);
  });

  it('rejects a missing space after the colon', () => {
    assert.equal(validateCommitMessage('fix:x').length, 1);
  });

  it('rejects trailing period and capitalized subject', () => {
    assert.deepEqual(validateCommitMessage('fix: Corrige bug.'), [
      'Assunto não deve terminar com ponto.',
      'Assunto deve começar com minúscula.',
    ]);
  });

  it('rejects long headers', () => {
    assert.match(validateCommitMessage(`feat: ${'a'.repeat(80)}`)[0], /máximo 72/);
  });

  it('requires a blank line before the body', () => {
    assert.deepEqual(validateCommitMessage('feat: x\ncorpo'), [
      'Deixe uma linha em branco entre o cabeçalho e o corpo.',
    ]);
  });

  it('handles CRLF line endings', () => {
    assert.deepEqual(validateCommitMessage('feat: x\r\n\r\ncorpo\r\n'), []);
  });
});
