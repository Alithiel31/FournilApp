import { execFileSync } from 'node:child_process';
import path from 'node:path';

function run(dir, scriptRelPath, args) {
  const script = path.resolve(dir, scriptRelPath);
  execFileSync(process.execPath, [script, ...args], {
    cwd: path.resolve(dir),
    stdio: 'inherit',
  });
}

export default {
  'backend/**/*.{ts,js}': (filenames) => {
    if (filenames.length === 0) return [];
    run('backend', 'node_modules/eslint/bin/eslint.js', ['--fix', ...filenames]);
    run('backend', 'node_modules/prettier/bin/prettier.cjs', ['--write', ...filenames]);
    return [];
  },
  'frontend/**/*.{ts,js,svelte}': (filenames) => {
    if (filenames.length === 0) return [];
    run('frontend', 'node_modules/eslint/bin/eslint.js', ['--fix', ...filenames]);
    run('frontend', 'node_modules/prettier/bin/prettier.cjs', ['--write', ...filenames]);
    return [];
  },
};