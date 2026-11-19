import { runTasks } from '../lib/run.mjs';

const tasks = [
  { name: 'prettier', command: 'npx', args: ['prettier', '--check', '.'] },
  { name: 'eslint', command: 'npx', args: ['eslint', '.', '--max-warnings', '0'] },
  { name: 'tsc', command: 'npm', args: ['run', 'typecheck', '-w', 'web'] },
  { name: 'node --test', command: 'node', args: ['--test', 'scripts/**/*.test.mjs'] },
  { name: 'vitest + coverage', command: 'npm', args: ['run', 'coverage', '-w', 'web'] },
  { name: 'dotnet format', command: 'dotnet', args: ['format', 'RubricaLab.slnx', '--verify-no-changes'] },
  { name: 'dotnet test', command: 'dotnet', args: ['test', 'RubricaLab.slnx', '--nologo'] },
  { name: 'vite build', command: 'npm', args: ['run', 'build', '-w', 'web'] },
];

if (process.env.SKIP_E2E !== '1') {
  tasks.push({ name: 'playwright', command: 'npm', args: ['run', 'e2e', '-w', 'web'] });
}

process.exit(runTasks('pre-push', tasks) ? 0 : 1);
