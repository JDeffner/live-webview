import { randomUUID } from 'node:crypto';
import type { BuildRegistration, TargetRegistration } from '@webview-dev/helper';
import { SignalWatcher, type SignalSink, message } from './signal';

interface Disposable { dispose(): void }
export interface Pending { revision: string; received: number; manual?: boolean }
export interface Target {
  key: string; input: TargetRegistration; paused: boolean; running: boolean; disposed: boolean;
  pending?: Pending; error?: string; lastCompleted?: string; subscriptions: Disposable[];
}
export interface Build { key: string; input: BuildRegistration; error?: string; buildFailure?: string; revisions: Set<string>; watcher?: Disposable }
export interface LogRecord { event: string; owner: string; target?: string; revision?: string; received?: number; durationMs?: number; error?: string }
export const keyOf = (owner: string, id: string) => JSON.stringify([owner, id]);
export class Registry implements Disposable {
  readonly targets = new Map<string, Target>();
  readonly builds = new Map<string, Build>();
  private disposed = false;
  constructor(private changed: () => void, private log: (record: LogRecord) => void,
    private watch: (path: string, buildId: string, sink: SignalSink) => Disposable = (path, id, sink) => new SignalWatcher(path, id, sink)) {}
  registerBuild(input: BuildRegistration): Disposable {
    this.validate(input.ownerExtensionId, input.buildId);
    if (input.signalUri?.scheme !== 'file' || !input.signalUri.fsPath) throw new Error('Build signal must be a local file URI');
    const key = keyOf(input.ownerExtensionId, input.buildId);
    if (this.builds.has(key)) throw new Error(`Build already registered: ${key}`);
    const build: Build = { key, input, revisions: new Set() };
    this.builds.set(key, build);
    const fail = (error: string) => {
      if (this.builds.get(key) !== build) return;
      if (build.error !== error) { build.error = error; this.log({ event: 'build error', owner: input.ownerExtensionId, error }); this.changed(); }
    };
    try {
      build.watcher = this.watch(input.signalUri.fsPath, input.buildId, {
        error: fail,
        signal: (signal, baseline, received) => {
          if (this.builds.get(key) !== build) return;
          const duplicate = build.revisions.has(signal.revision);
          if (!duplicate) build.buildFailure = signal.status === 'error' ? signal.message : undefined;
          build.error = build.buildFailure;
          this.changed();
          if (duplicate) return;
          build.revisions.add(signal.revision);
          this.log({ event: `build ${signal.status}${baseline ? ' baseline' : ''}`, owner: input.ownerExtensionId, revision: signal.revision, received, error: signal.message });
          if (signal.status === 'success' && !baseline) {
            for (const target of this.targets.values()) if (target.input.ownerExtensionId === input.ownerExtensionId && target.input.buildId === input.buildId) { target.pending = { revision: signal.revision, received }; this.drain(target); }
          }
        },
      });
    } catch (error) { this.builds.delete(key); throw error; }
    this.changed();
    return { dispose: () => {
      if (this.builds.get(key) !== build) return;
      this.builds.delete(key); build.watcher?.dispose();
      for (const target of [...this.targets.values()]) if (target.input.ownerExtensionId === input.ownerExtensionId && target.input.buildId === input.buildId) this.remove(target);
      this.changed();
    } };
  }
  registerTarget(input: TargetRegistration): Disposable {
    this.validate(input.ownerExtensionId, input.instanceId);
    if (!this.builds.has(keyOf(input.ownerExtensionId, input.buildId))) throw new Error(`Register build ${input.buildId} before its targets`);
    if (typeof input.label !== 'string' || !input.label.trim() || input.label.length > 500 || typeof input.viewType !== 'string' || !input.viewType || ['reload', 'isVisible', 'onDidDispose', 'onDidChangeVisibility'].some(name => typeof input[name as keyof TargetRegistration] !== 'function')) throw new Error('Invalid target metadata or lifecycle callbacks');
    const key = keyOf(input.ownerExtensionId, input.instanceId);
    if (this.targets.has(key)) throw new Error(`Target already registered: ${key}`);
    const target: Target = { key, input, paused: false, running: false, disposed: false, subscriptions: [] };
    this.targets.set(key, target);
    try { target.subscriptions.push(input.onDidDispose(() => this.remove(target)), input.onDidChangeVisibility(() => { this.drain(target); this.changed(); })); }
    catch (error) { this.remove(target); throw error; }
    this.changed();
    return { dispose: () => this.remove(target) };
  }
  manual(key: string) { const target = this.targets.get(key); if (target) { target.pending = { revision: `manual-${randomUUID()}`, received: Date.now(), manual: true }; this.drain(target); } }
  pause(key: string, paused: boolean) { const target = this.targets.get(key); if (target) { target.paused = paused; this.drain(target); this.changed(); } }
  status(target: Target) {
    if (target.running) return 'Reloading';
    if (target.paused) return 'Paused';
    if (target.error) return 'Reload failed';
    if (this.builds.get(keyOf(target.input.ownerExtensionId, target.input.buildId))?.error) return 'Build failed';
    if (target.pending) return 'Pending reveal';
    return 'Watching';
  }
  private drain(target: Target) {
    if (target.disposed || target.running || !target.pending || (target.paused && !target.pending.manual)) return;
    try { if (!target.input.isVisible()) { this.changed(); return; } }
    catch (error) { target.error = message(error); this.changed(); return; }
    const pending = target.pending;
    target.pending = undefined; target.running = true; target.error = undefined;
    const start = Date.now();
    const base = { owner: target.input.ownerExtensionId, target: target.input.instanceId, revision: pending.revision, received: pending.received };
    this.log({ ...base, event: 'reload callback started', durationMs: start - pending.received });
    this.changed();
    void (async () => {
      try {
        await target.input.reload(pending.revision);
        if (target.disposed) return;
        target.lastCompleted = pending.revision;
        this.log({ ...base, event: 'reload callback completed', durationMs: Date.now() - start });
      } catch (error) {
        if (target.disposed) return;
        target.error = message(error);
        this.log({ ...base, event: 'reload callback failed', durationMs: Date.now() - start, error: target.error });
      } finally { target.running = false; if (!target.disposed) { this.changed(); this.drain(target); } }
    })();
  }
  private remove(target: Target) {
    if (target.disposed) return;
    target.disposed = true; target.pending = undefined; this.targets.delete(target.key);
    for (const item of target.subscriptions) item.dispose();
    this.changed();
  }
  private validate(owner: string, id: string) {
    if (this.disposed) throw new Error('Devtools integration is disposed');
    if (typeof owner !== 'string' || !owner.trim() || owner.length > 200 || typeof id !== 'string' || !id.trim() || id.length > 200) throw new Error('Owner and ID must be nonempty strings of at most 200 characters');
  }
  dispose() { this.disposed = true; for (const build of this.builds.values()) build.watcher?.dispose(); this.builds.clear(); for (const target of [...this.targets.values()]) this.remove(target); }
}
