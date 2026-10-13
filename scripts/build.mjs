import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const files = ['package.json', 'package-lock.json', 'src/data/version.ts'];
const originals = files.map(file => fs.readFileSync(file, 'utf8'));
const pkg = JSON.parse(originals[0]);
const parts = pkg.version.split('.').map(Number);
if (parts.length !== 3 || parts.some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error('Expected numeric major.minor.patch version');
const version = pkg.version === '0.0.0' ? '0.1.0' : [parts[0], parts[1], parts[2] + 1].join('.');
let succeeded = false;
try {
  pkg.version = version;
  const lock = JSON.parse(originals[1]); lock.version = version; lock.packages[''].version = version;
  fs.writeFileSync(files[0], JSON.stringify(pkg, null, 2) + '\n');
  fs.writeFileSync(files[1], JSON.stringify(lock, null, 2) + '\n');
  fs.writeFileSync(files[2], 'export const GAME_VERSION = ' + JSON.stringify(version) + ';\n');
  for (const script of ['node_modules/typescript/bin/tsc', 'node_modules/vite/bin/vite.js']) {
    const result = spawnSync(process.execPath, [script, ...(script.includes('vite') ? ['build'] : [])], { stdio: 'inherit' });
    if (result.error || result.status !== 0) throw result.error ?? new Error('Build failed');
  }
  const builtAt = new Date().toISOString();
  const history = fs.existsSync('build-history.json') ? JSON.parse(fs.readFileSync('build-history.json', 'utf8')) : [];
  fs.writeFileSync('dist/version.json', JSON.stringify({ version, builtAt }, null, 2) + '\n');
  fs.writeFileSync('build-history.json', JSON.stringify([...history, { version, builtAt }], null, 2) + '\n');
  succeeded = true;
  console.log('Alpha Strike v' + version + ' built successfully.');
} finally {
  if (!succeeded) files.forEach((file, index) => fs.writeFileSync(file, originals[index]));
}
