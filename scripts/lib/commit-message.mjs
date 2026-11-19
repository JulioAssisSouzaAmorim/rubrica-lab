const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const HEADER = new RegExp(
  `^(?<type>${TYPES.join('|')})(?:\\((?<scope>[a-z0-9-]+)\\))?(?<breaking>!)?: (?<subject>.+)$`,
);
const MAX_HEADER = 72;

/** Returns a list of problems; empty means the message follows Conventional Commits. */
export function validateCommitMessage(raw) {
  const lines = raw
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('#'))
    .join('\n')
    .trimEnd()
    .split('\n');
  const header = lines[0] ?? '';

  if (/^(Merge|Revert) /.test(header) || /^(fixup|squash|amend)! /.test(header)) return [];

  const problems = [];
  const match = HEADER.exec(header);
  if (!match) {
    problems.push(`Cabeçalho deve seguir "tipo(escopo): assunto" com tipo em: ${TYPES.join(', ')}.`);
  } else {
    const { subject } = match.groups;
    if (subject.endsWith('.')) problems.push('Assunto não deve terminar com ponto.');
    if (/^[A-Z]/.test(subject)) problems.push('Assunto deve começar com minúscula.');
  }
  if (header.length > MAX_HEADER)
    problems.push(`Cabeçalho com ${header.length} caracteres (máximo ${MAX_HEADER}).`);
  if (lines.length > 1 && lines[1] !== '')
    problems.push('Deixe uma linha em branco entre o cabeçalho e o corpo.');
  return problems;
}
