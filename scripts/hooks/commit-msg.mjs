import { readFileSync } from 'node:fs';
import { validateCommitMessage } from '../lib/commit-message.mjs';

const problems = validateCommitMessage(readFileSync(process.argv[2], 'utf8'));

if (problems.length > 0) {
  console.error('✘ Mensagem de commit inválida:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  console.error('  Exemplo: feat(engine): adiciona função teto()');
  process.exit(1);
}
