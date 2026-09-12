import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
import { SignalWatcher, parseSignal } from '../../packages/extension/src/signal';
import { createSignalPublisher, webviewDevSignal } from '../../packages/helper/src/esbuild';
const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => { for (const cleanup of cleanups.reverse()) await cleanup(); cleanups.length = 0; });
async function temp() { const root = await mkdtemp(join(tmpdir(), 'webview-dev-')); cleanups.push(() => rm(root, { recursive: true, force: true })); return root; }
it('validates schema, ID, revision, errors, and bounded size', () => {
  const good = { schemaVersion: 1, buildId: 'ui', revision: 'r', status: 'success' };
  expect(parseSignal(Buffer.from(JSON.stringify(good)), 'ui')).toEqual(good);
  for (const data of ['{', 'null', JSON.stringify({ ...good, buildId: 'other' }), JSON.stringify({ ...good, revision: '' }), JSON.stringify({ ...good, status: 'error' })]) expect(() => parseSignal(Buffer.from(data), 'ui')).toThrow();
  expect(() => parseSignal(Buffer.alloc(8193), 'ui')).toThrow('8192');
});
it('recovers from missing directories, malformed files, replacement, and directory recreation', async () => {
  const root = await temp(), path = join(root, 'missing/signal.json');
  const signal = vi.fn(), error = vi.fn();
  const watcher = new SignalWatcher(path, 'ui', { signal, error }); cleanups.push(() => watcher.dispose());
  await vi.waitFor(() => expect(error).toHaveBeenCalled());
  const publish = createSignalPublisher({ projectRoot: root, signalPath: 'missing/signal.json', buildId: 'ui' });
  const first = await publish({ status: 'success' });
  await vi.waitFor(() => expect(signal).toHaveBeenCalledWith(first, false, expect.any(Number)));
  await writeFile(path, '{'); await vi.waitFor(() => expect(error.mock.calls.some(call => call[0].includes('Cannot read'))).toBe(true));
  const second = await publish({ status: 'success' }); await vi.waitFor(() => expect(signal).toHaveBeenCalledWith(second, false, expect.any(Number)));
  // Move the watched directory away to emulate removal without deleting a live watcher handle.
  await rename(join(root, 'missing'), join(root, 'old'));
  await mkdir(join(root, 'missing'));
  const third = await publish({ status: 'success' });
  await vi.waitFor(() => expect(signal).toHaveBeenCalledWith(third, false, expect.any(Number)), { timeout: 2000 });
});
it('uses the current signal as a baseline after watch installation', async () => {
  const root = await temp(); const publish = createSignalPublisher({ projectRoot: root, signalPath: 'signal.json', buildId: 'ui' });
  const first = await publish({ status: 'success' }), signal = vi.fn();
  const watcher = new SignalWatcher(join(root, 'signal.json'), 'ui', { signal, error: vi.fn() }); cleanups.push(() => watcher.dispose());
  await vi.waitFor(() => expect(signal).toHaveBeenCalledWith(first, true, expect.any(Number)));
});
it('publishes after async output plugins and reports real build failure then recovery', async () => {
  const root = await temp(), options = { projectRoot: root, signalPath: 'signal.json', buildId: 'ui' };
  const plugin = webviewDevSignal(options);
  let finished = false;
  const config = { outfile: join(root, 'bundle.js'), logLevel: 'silent' as const, plugins: [{ name: 'extra-output', setup(api: import('esbuild').PluginBuild) { api.onEnd(async result => { if (!result.errors.length) { await writeFile(join(root, 'extra.txt'), 'complete'); finished = true; } }); } }, plugin] };
  await build({ ...config, stdin: { contents: 'export const value = 1' } });
  expect(finished).toBe(true); expect(await readFile(join(root, 'extra.txt'), 'utf8')).toBe('complete');
  const success = JSON.parse(await readFile(join(root, 'signal.json'), 'utf8'));
  await expect(build({ ...config, stdin: { contents: 'const =' } })).rejects.toThrow();
  expect(JSON.parse(await readFile(join(root, 'signal.json'), 'utf8')).status).toBe('error');
  await build({ ...config, stdin: { contents: 'export const value = 2' } });
  const recovery = JSON.parse(await readFile(join(root, 'signal.json'), 'utf8')); expect(recovery.status).toBe('success'); expect(recovery.revision).not.toBe(success.revision);
  expect(() => createSignalPublisher({ ...options, signalPath: '../escape.json' })).toThrow();
});
