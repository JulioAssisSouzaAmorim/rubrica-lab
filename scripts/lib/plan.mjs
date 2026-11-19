const DOTNET = /\.(cs|csproj|slnx|props)$|(^|\/)\.editorconfig$/;
const WEB_SOURCE = /^web\/.*\.(ts|tsx)$/;
const WEB_CONFIG =
  /^(web\/)?(package\.json|package-lock\.json|tsconfig\.json|vite\.config\.ts|eslint\.config\.js)$/;
const SCRIPT = /^scripts\/.*\.mjs$/;
const PRETTIER = /\.(ts|tsx|js|mjs|json|css|md|ya?ml|html)$/;
const LINTABLE = /\.(ts|tsx|mjs|js)$/;

/**
 * Decides which checks a commit needs from the list of staged paths.
 * Pure on purpose: it is the part worth unit testing.
 */
export function planChecks(files) {
  const tasks = [];
  const webSources = files.filter((f) => WEB_SOURCE.test(f));
  const webConfigChanged = files.some((f) => WEB_CONFIG.test(f));
  const scripts = files.filter((f) => SCRIPT.test(f));
  const formattable = files.filter((f) => PRETTIER.test(f) && !f.endsWith('package-lock.json'));
  const lintable = files.filter(
    (f) => LINTABLE.test(f) && (f.startsWith('web/') || SCRIPT.test(f) || !f.includes('/')),
  );

  if (formattable.length > 0) {
    tasks.push({ name: 'prettier', command: 'npx', args: ['prettier', '--check', ...formattable] });
  }
  if (lintable.length > 0) {
    tasks.push({ name: 'eslint', command: 'npx', args: ['eslint', '--max-warnings', '0', ...lintable] });
  }
  if (webSources.length > 0 || webConfigChanged) {
    tasks.push({ name: 'tsc', command: 'npm', args: ['run', 'typecheck', '-w', 'web'] });
    tasks.push(
      webConfigChanged
        ? { name: 'vitest', command: 'npx', args: ['vitest', 'run'], cwd: 'web' }
        : {
            name: 'vitest (related)',
            command: 'npx',
            args: [
              'vitest',
              'related',
              '--run',
              '--passWithNoTests',
              ...webSources.map((f) => f.slice('web/'.length)),
            ],
            cwd: 'web',
          },
    );
  }
  if (scripts.length > 0) {
    tasks.push({ name: 'node --test', command: 'node', args: ['--test', 'scripts/**/*.test.mjs'] });
  }
  if (files.some((f) => DOTNET.test(f))) {
    tasks.push({
      name: 'dotnet format',
      command: 'dotnet',
      args: ['format', 'RubricaLab.slnx', '--verify-no-changes'],
    });
    tasks.push({ name: 'dotnet test', command: 'dotnet', args: ['test', 'RubricaLab.slnx', '--nologo'] });
  }
  return tasks;
}
