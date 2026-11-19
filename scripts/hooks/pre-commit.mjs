import { stagedBlob, stagedFiles } from '../lib/git.mjs';
import { findProblems } from '../lib/guards.mjs';
import { planChecks } from '../lib/plan.mjs';
import { runTasks } from '../lib/run.mjs';

const files = stagedFiles();
const problems = findProblems(files.map(stagedBlob));

if (problems.length > 0) {
  console.error('✘ Commit bloqueado:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}

process.exit(runTasks('pre-commit', planChecks(files)) ? 0 : 1);
