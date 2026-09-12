import { watch, statSync, type FSWatcher } from 'node:fs';
import { open } from 'node:fs/promises';
import { basename, dirname } from 'node:path';

export interface Signal { schemaVersion: 1; buildId: string; revision: string; status: 'success' | 'error'; message?: string }
export const MAX_SIGNAL_BYTES = 8192;
export function parseSignal(data: Buffer, buildId: string): Signal {
  if (data.length > MAX_SIGNAL_BYTES) throw new Error('Build signal exceeds 8192 bytes');
  const value = JSON.parse(data.toString('utf8')) as Partial<Signal> | null;
  if (!value || value.schemaVersion !== 1 || value.buildId !== buildId || typeof value.revision !== 'string' || !value.revision.trim() || value.revision.length > 200 || !['success', 'error'].includes(value.status ?? '') || ((value.status === 'error' || value.message !== undefined) && (typeof value.message !== 'string' || value.message.length > 2000))) throw new Error('Invalid build signal: expected schemaVersion 1, matching buildId, revision, and success/error status');
  return value as Signal;
}
export interface SignalSink { signal(signal: Signal, baseline: boolean, received: number): void; error(message: string): void }
/** Watches the parent directory for creation/replacement. Retries missing parents without creating them. */
export class SignalWatcher {
  private watcher?: FSWatcher;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private reading = false;
  private dirty = false;
  private baseline = true;
  private directoryIdentity?: string;
  private health: ReturnType<typeof setInterval>;
  constructor(private path: string, private buildId: string, private sink: SignalSink) {
    this.reconcile();
    // A directory can be renamed without notifying a watcher inside it on Windows.
    this.health = setInterval(() => {
      if (!this.watcher) return;
      try { if (this.identity() === this.directoryIdentity) return; } catch { /* Retry the explicit path below. */ }
      this.watcher.close(); this.watcher = undefined; this.reconcile();
    }, 1000);
  }
  private identity() { const info = statSync(dirname(this.path)); return `${info.dev}:${info.ino}`; }
  private reconcile() {
    if (this.disposed) return;
    if (!this.watcher) {
      try {
        this.directoryIdentity = this.identity();
        this.watcher = watch(dirname(this.path), (_event, file) => { if (!file || file.toString() === basename(this.path) || file.toString() === basename(dirname(this.path))) this.schedule(20); });
        this.watcher.on('error', error => { this.sink.error(error.message); this.watcher?.close(); this.watcher = undefined; this.schedule(250); });
      } catch (error) { this.sink.error(`Cannot watch signal directory: ${message(error)}`); this.baseline = false; this.schedule(250); return; }
    }
    void this.read();
  }
  private schedule(ms: number) {
    if (this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; this.reconcile(); }, ms);
  }
  private async read() {
    if (this.reading) { this.dirty = true; return; }
    this.reading = true;
    try {
      const file = await open(this.path, 'r');
      let bytes: Buffer;
      try { const buffer = Buffer.alloc(MAX_SIGNAL_BYTES + 1); const result = await file.read(buffer, 0, buffer.length, 0); bytes = buffer.subarray(0, result.bytesRead); }
      finally { await file.close(); }
      const signal = parseSignal(bytes, this.buildId);
      if (!this.disposed) this.sink.signal(signal, this.baseline, Date.now());
    } catch (error) {
      if (!this.disposed) {
        this.sink.error(`Cannot read build signal: ${message(error)}`);
        this.watcher?.close(); this.watcher = undefined;
        this.schedule(250);
      }
    } finally {
      this.baseline = false; this.reading = false;
      if (this.dirty && !this.disposed) { this.dirty = false; this.schedule(0); }
    }
  }
  dispose() { this.disposed = true; clearInterval(this.health); if (this.timer) clearTimeout(this.timer); this.watcher?.close(); }
}
export function message(error: unknown) { return error instanceof Error ? error.message : String(error); }
