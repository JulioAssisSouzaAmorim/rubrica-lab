import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const color = (code, text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const quote = (arg) => (/[\s"&|<>^*]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg);

/** Runs tasks in order, streaming their output, and prints a summary. Returns true if all passed. */
export function runTasks(title, tasks) {
  if (tasks.length === 0) {
    console.log(color(2, `${title}: nada a verificar.`));
    return true;
  }

  const results = [];
  for (const task of tasks) {
    console.log(color(36, `\n▶ ${task.name}`));
    const started = performance.now();
    // shell is needed for npm/npx shims on Windows
    const { status } = spawnSync([task.command, ...task.args].map(quote).join(' '), {
      cwd: resolve(root, task.cwd ?? '.'),
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, FORCE_COLOR: process.stdout.isTTY ? '1' : '0' },
    });
    results.push({ name: task.name, ok: status === 0, seconds: (performance.now() - started) / 1000 });
  }

  console.log(color(1, `\n${title}`));
  for (const { name, ok, seconds } of results) {
    console.log(`  ${ok ? color(32, '✔') : color(31, '✘')} ${name.padEnd(22)} ${seconds.toFixed(1)}s`);
  }
  return results.every((r) => r.ok);
}
