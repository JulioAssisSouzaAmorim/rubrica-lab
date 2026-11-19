import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { planChecks } from './plan.mjs';

const names = (files) => planChecks(files).map((t) => t.name);

describe('planChecks', () => {
  it('does nothing for an empty commit', () => {
    assert.deepEqual(planChecks([]), []);
  });

  it('runs only the .NET pipeline for C# changes', () => {
    assert.deepEqual(names(['src/RubricaLab.Core/Engine/Evaluator.cs']), ['dotnet format', 'dotnet test']);
  });

  it('treats build props and editorconfig as .NET changes', () => {
    assert.deepEqual(names(['Directory.Build.props']), ['dotnet format', 'dotnet test']);
    assert.deepEqual(names(['.editorconfig']), ['dotnet format', 'dotnet test']);
  });

  it('runs related tests only for the staged web sources', () => {
    const tasks = planChecks(['web/src/format.ts', 'web/src/App.tsx']);
    const vitest = tasks.find((t) => t.name.startsWith('vitest'));

    assert.deepEqual(
      tasks.map((t) => t.name),
      ['prettier', 'eslint', 'tsc', 'vitest (related)'],
    );
    assert.equal(vitest.cwd, 'web');
    assert.deepEqual(vitest.args.slice(-2), ['src/format.ts', 'src/App.tsx']);
  });

  it('runs the whole web suite when its configuration changes', () => {
    const vitest = planChecks(['web/vite.config.ts']).find((t) => t.name.startsWith('vitest'));
    assert.deepEqual(vitest.args, ['vitest', 'run']);
  });

  it('tests the hook scripts when they change', () => {
    assert.deepEqual(names(['scripts/lib/plan.mjs']), ['prettier', 'eslint', 'node --test']);
  });

  it('only formats docs and css', () => {
    assert.deepEqual(names(['README.md', 'web/src/styles.css']), ['prettier']);
  });

  it('never formats the lockfile', () => {
    const tasks = planChecks(['package-lock.json']);
    assert.ok(!tasks.some((t) => t.name === 'prettier'));
    assert.ok(tasks.some((t) => t.name === 'tsc'));
  });

  it('combines stacks in a mixed commit', () => {
    assert.deepEqual(names(['web/src/api.ts', 'src/RubricaLab.Api/RubricaApi.cs']), [
      'prettier',
      'eslint',
      'tsc',
      'vitest (related)',
      'dotnet format',
      'dotnet test',
    ]);
  });
});
