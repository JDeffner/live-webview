import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';
import { spawnSync, spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
const absent = process.argv.includes('--absent');
const packaged = process.argv.includes('--packaged');
const development = process.argv.includes('--development');
const production = process.argv.includes('--production');
const untrusted = process.argv.includes('--untrusted');
const independent = process.argv.includes('--independent');
const watch = process.argv.includes('--watch');
const name = [packaged ? 'packaged' : 'dual', independent && 'independent', absent && 'absent', development && 'development', production && 'production', untrusted && 'untrusted', watch && 'watch'].filter(Boolean).join('-');
const fixture = resolve(independent ? 'artifacts/fixture' : 'examples/esbuild');
const buildResult = spawnSync(process.execPath, [resolve(fixture, 'build.mjs'), ...(development ? [] : ['--test']), ...(production ? ['--production'] : [])], { stdio: 'inherit', windowsHide: true });
if (buildResult.status !== 0) throw new Error('Fixture build failed');
if (production && /connectDevtools|registerTarget|registerBuild|local\.live-webview/.test(await readFile(resolve(fixture, 'dist/extension.js'), 'utf8'))) throw new Error('Production bundle retained development integration');
const profile = resolve('.vscode-test', `profile-${name}`);
const extensions = resolve('.vscode-test', packaged ? 'extensions-live-webview-packaged' : 'extensions-empty');
await mkdir(resolve(profile, 'User'), { recursive: true });
await writeFile(resolve(profile, 'User/settings.json'), JSON.stringify({ 'security.workspace.trust.enabled': untrusted, 'security.workspace.trust.startupPrompt': 'never', 'workbench.startupEditor': 'none', 'extensions.autoCheckUpdates': false, 'extensions.autoUpdate': false }));
await mkdir('artifacts', { recursive: true });
const vscodeExecutablePath = await downloadAndUnzipVSCode('1.74.0');
delete process.env.ELECTRON_RUN_AS_NODE;
if (packaged) {
  const cli = resolve(dirname(vscodeExecutablePath), process.platform === 'darwin' ? '../Resources/app/out/cli.js' : 'resources/app/out/cli.js');
  const result = spawnSync(vscodeExecutablePath, [cli, '--ms-enable-electron-run-as-node', '--user-data-dir', profile, '--extensions-dir', extensions, '--install-extension', resolve('artifacts/live-webview-0.1.0.vsix'), '--force'], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw new Error('VSIX installation failed');
}
const resultPath = resolve('artifacts', `samples-${name}.json`);
const suite = resolve('tests/integration/dist/suite.js');
const devPaths = [fixture, ...(!absent && !packaged ? [resolve('packages/extension')] : [])];
const testEnv = { FIXTURE_ABSENT: absent ? '1' : '0', FIXTURE_PRODUCTION: production ? '1' : '0', FIXTURE_UNTRUSTED: untrusted ? '1' : '0', FIXTURE_DEVELOPMENT: development ? '1' : '0', FIXTURE_WATCH: watch ? '1' : '0', FIXTURE_RESULTS: resultPath };
const args = [fixture, '--user-data-dir', profile, '--extensions-dir', extensions, ...(!untrusted ? ['--disable-workspace-trust'] : []), '--skip-welcome', '--skip-release-notes', '--no-sandbox', '--disable-gpu', '--disable-updates'];
let watcher;
try {
if (watch) {
  watcher = spawn(process.execPath, [resolve(fixture, 'build.mjs'), '--watch', ...(development ? [] : ['--test'])], { stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Watch startup timed out')), 20000);
    let output = '';
    watcher.stdout.on('data', data => { output += data.toString(); if (output.includes('Fixture watch ready')) { clearTimeout(timer); resolve(); } });
    watcher.once('error', error => { clearTimeout(timer); reject(error); }); watcher.once('exit', code => { clearTimeout(timer); reject(new Error(`Watch exited ${code}`)); });
  });
}
if (development || untrusted) {
  // The Microsoft runner always supplies --disable-workspace-trust and Test mode.
  // These two cases use its downloaded host with the public launch flags directly.
  const probe = resolve('artifacts', `probe-${name}.json`);
  if (development) await writeFile(probe, '{}');
  const child = spawn(vscodeExecutablePath, [...args, ...devPaths.map(path => `--extensionDevelopmentPath=${path}`), ...(!development ? [`--extensionTestsPath=${suite}`] : [])], { env: { ...process.env, ...testEnv, ...(development ? { FIXTURE_PROBE_SUITE: suite, FIXTURE_PROBE_RESULT: probe } : {}) }, stdio: 'inherit', windowsHide: true });
  const timer = setTimeout(() => child.kill(), 120000);
  try { await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Host exited ${code}`))); }); }
  finally { clearTimeout(timer); }
  if (development) { const result = JSON.parse(await readFile(probe, 'utf8')); if (!result.passed) throw new Error(`Development probe failed: ${result.error ?? 'no result'}`); }
} else {
  await runTests({ vscodeExecutablePath, extensionDevelopmentPath: devPaths, extensionTestsPath: suite, extensionTestsEnv: testEnv, launchArgs: args });
}
} finally {
  if (watcher && watcher.exitCode === null) { const stopped = new Promise(resolve => watcher.once('exit', resolve)); watcher.kill(); await stopped; }
}
async function files(root) { const result = []; for (const entry of await readdir(root, { withFileTypes: true })) { const path = resolve(root, entry.name); if (entry.isDirectory()) result.push(...await files(path)); else result.push(path); } return result; }
if (!absent && !production && !untrusted) {
  const result = JSON.parse(await readFile(resultPath, 'utf8'));
  const logs = (await files(resolve(profile, 'logs'))).filter(path => path.endsWith('Live Webview.log'));
  const records = [];
  for (const path of logs) for (const line of (await readFile(path, 'utf8')).split('\n')) { try { records.push(JSON.parse(line)); } catch { /* Ignore non-JSON host diagnostics. */ } }
  for (const sample of result.samples) {
    const log = records.find(record => record.revision === sample.revision && record.target === 'one' && record.event === 'reload callback started');
    if (!log) throw new Error(`Missing receipt log for ${sample.revision}`);
    sample.received = log.received; sample.receiptToStartMs = log.durationMs; sample.receiptToReadyMs = sample.ready - log.received;
  }
  result.summary = Object.fromEntries(['buildMs', 'receiptToStartMs', 'receiptToReadyMs'].map(key => { const values = result.samples.map(sample => sample[key]).sort((a, b) => a - b); return [key, { min: values[0], median: values[Math.floor(values.length / 2)], p95: values[Math.ceil(values.length * .95) - 1], max: values.at(-1) }]; }));
  await writeFile(resultPath, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result.summary));
}
