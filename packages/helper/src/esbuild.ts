import type { Plugin } from 'esbuild';
import { mkdir, rename, writeFile, rm } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, relative, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface SignalOptions { projectRoot: string; signalPath: string; buildId: string }
export type BuildOutcome = { status: 'success' } | { status: 'error'; message: string };
/** One publisher per build group. Await publication before starting the next build. */
export function createSignalPublisher(options: SignalOptions) {
  if (!isAbsolute(options.projectRoot) || isAbsolute(options.signalPath) || !options.signalPath || !options.buildId.trim() || options.buildId.length > 200) throw new Error('Supply an absolute projectRoot, relative signalPath, and buildId (1-200 characters)');
  const path = resolve(options.projectRoot, options.signalPath);
  const relativePath = relative(options.projectRoot, path);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${sep}`)) throw new Error('Signal must be inside projectRoot');
  let queue: Promise<unknown> = Promise.resolve();
  return (outcome: BuildOutcome) => {
    const revision = randomUUID();
    const signal = { schemaVersion: 1, buildId: options.buildId, revision, status: outcome.status, ...(outcome.status === 'error' ? { message: outcome.message.slice(0, 2000) } : {}) };
    const task = queue.then(async () => {
      const json = JSON.stringify(signal);
      if (Buffer.byteLength(json) > 8192) throw new Error('Signal exceeds 8192 bytes; shorten the build ID or error message');
      await mkdir(dirname(path), { recursive: true });
      const temporary = `${path}.${revision}.tmp`;
      try { await writeFile(temporary, json, { flag: 'wx' }); await rename(temporary, path); }
      finally { await rm(temporary, { force: true }); }
      return signal;
    });
    queue = task.catch(() => {});
    return task;
  };
}
/** Place LAST in plugins. Earlier output-producing onEnd hooks must return their promises. */
export function webviewDevSignal(options: SignalOptions): Plugin {
  const publish = createSignalPublisher(options);
  return { name: 'webview-dev-signal', setup(build) {
    if (build.initialOptions.write === false) throw new Error('Signal adapter requires write:true. Use createSignalPublisher after writing outputFiles yourself.');
    build.onEnd(async result => { await publish(result.errors.length ? { status: 'error', message: result.errors.map(error => error.text).join('; ') } : { status: 'success' }); });
  } };
}
