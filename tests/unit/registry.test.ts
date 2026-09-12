import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TargetRegistration, BuildRegistration } from '../../packages/helper/src/types';
import { Registry, keyOf } from '../../packages/extension/src/registry';
import type { SignalSink } from '../../packages/extension/src/signal';

function event() { const listeners = new Set<() => void>(); return { event: (listener: () => void) => { listeners.add(listener); return { dispose: () => { listeners.delete(listener); } }; }, fire: () => { for (const listener of listeners) listener(); } }; }
const owner = 'test.owner';
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const registries: Registry[] = [];
afterEach(() => { for (const registry of registries) registry.dispose(); registries.length = 0; });
function setup() {
  const sinks = new Map<string, SignalSink>();
  const log = vi.fn();
  const stop = vi.fn();
  const registry = new Registry(() => {}, log, (_path, id, sink) => { sinks.set(id, sink); return { dispose: stop }; });
  registries.push(registry);
  const build = (buildId = 'ui') => registry.registerBuild({ ownerExtensionId: owner, buildId, signalUri: { scheme: 'file', fsPath: '/signal.json' } as BuildRegistration['signalUri'] });
  build(); build('other');
  const signal = (revision: string, status: 'success' | 'error' = 'success', baseline = false) => sinks.get('ui')!.signal({ schemaVersion: 1, buildId: 'ui', revision, status, ...(status === 'error' ? { message: 'compile failed' } : {}) }, baseline, Date.now());
  const target = (id: string, reload: TargetRegistration['reload'] = vi.fn(), buildId = 'ui') => {
    const close = event(), visibility = event();
    let visible = true;
    const input: TargetRegistration = { ownerExtensionId: owner, instanceId: id, buildId, label: id, viewType: 'panel', reload, isVisible: () => visible, onDidDispose: close.event, onDidChangeVisibility: visibility.event };
    const handle = registry.registerTarget(input);
    return { input, reload, handle, close: close.fire, visible: (value: boolean) => { visible = value; visibility.fire(); }, key: keyOf(owner, id) };
  };
  return { registry, signal, target, sinks, log, stop, build };
}
describe('reload scheduling', () => {
  it('baselines quietly, reloads shared instances only, and ignores duplicate revisions', async () => {
    const x = setup(), a = x.target('a'), b = x.target('b'), other = x.target('other', vi.fn(), 'other');
    x.signal('base', 'success', true); expect(a.reload).not.toHaveBeenCalled();
    x.signal('one'); await flush(); x.signal('one'); x.signal('base');
    expect(a.reload).toHaveBeenCalledTimes(1); expect(b.reload).toHaveBeenCalledTimes(1); expect(other.reload).not.toHaveBeenCalled();
    x.registry.manual(a.key); await flush(); expect(a.reload).toHaveBeenCalledTimes(2); expect(b.reload).toHaveBeenCalledTimes(1);
  });
  it('serializes callbacks and completes the latest burst revision', async () => {
    let finish!: () => void;
    const reload = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; })).mockResolvedValue(undefined);
    const x = setup(), a = x.target('a', reload);
    x.signal('one'); x.signal('two'); x.signal('three');
    expect(reload).toHaveBeenCalledTimes(1); finish(); await flush();
    expect(reload.mock.calls.map(call => call[0])).toEqual(['one', 'three']);
    expect(x.registry.targets.get(a.key)!.lastCompleted).toBe('three');
  });
  it('keeps the newest revision while hidden and paused, then applies it on reveal', async () => {
    const x = setup(), a = x.target('a'); a.visible(false); x.registry.pause(a.key, true);
    x.signal('one'); x.signal('two'); x.registry.pause(a.key, false); expect(a.reload).not.toHaveBeenCalled();
    a.visible(true); await flush(); expect(a.reload).toHaveBeenCalledExactlyOnceWith('two');
    x.registry.pause(a.key, true); x.registry.manual(a.key); await flush(); expect(a.reload).toHaveBeenCalledTimes(2);
  });
  it('isolates callback failure and retries on the next success', async () => {
    const x = setup(), a = x.target('a', vi.fn().mockRejectedValueOnce(new Error('bad renderer')).mockResolvedValue(undefined)), b = x.target('b');
    x.signal('one'); await flush(); expect(x.registry.status(x.registry.targets.get(a.key)!)).toBe('Reload failed'); expect(b.reload).toHaveBeenCalled();
    x.signal('failed', 'error'); expect(a.reload).toHaveBeenCalledTimes(1);
    x.signal('recovered'); await flush(); expect(x.registry.targets.get(a.key)!.lastCompleted).toBe('recovered'); expect(x.registry.status(x.registry.targets.get(a.key)!)).toBe('Watching');
  });
  it('drops queued work at disposal and does not revive a reused ID', async () => {
    let finish!: () => void;
    const x = setup(), a = x.target('a', () => new Promise<void>(resolve => { finish = resolve; }));
    x.signal('one'); x.signal('two'); a.close(); const replacement = x.target('a'); finish(); await flush();
    expect(replacement.reload).not.toHaveBeenCalled(); expect(x.registry.targets.get(a.key)!.lastCompleted).toBeUndefined();
  });
  it('rejects conflicts and removes the build watcher and targets together', () => {
    const x = setup(), a = x.target('a');
    expect(() => x.registry.registerTarget(a.input)).toThrow('already registered');
    expect(() => x.build()).toThrow('already registered');
    expect(() => x.target('unknown', vi.fn(), 'missing')).toThrow('Register build');
    x.registry.dispose(); expect(x.stop).toHaveBeenCalledTimes(2); expect(x.registry.targets.size).toBe(0);
  });
  it('surfaces recoverable watcher errors without repeated diagnostics', () => {
    const x = setup(), a = x.target('a'); x.sinks.get('ui')!.error('missing'); x.sinks.get('ui')!.error('missing');
    expect(x.registry.status(x.registry.targets.get(a.key)!)).toBe('Build failed'); expect(x.log).toHaveBeenCalledTimes(1);
    x.signal('base', 'success', true); expect(x.registry.status(x.registry.targets.get(a.key)!)).toBe('Watching');
  });
  it('does not let a replayed success hide a newer build failure', () => {
    const x = setup(), a = x.target('a'); x.signal('base', 'success', true); x.signal('failure', 'error'); x.signal('base');
    expect(x.registry.status(x.registry.targets.get(a.key)!)).toBe('Build failed'); expect(a.reload).not.toHaveBeenCalled();
  });
});
