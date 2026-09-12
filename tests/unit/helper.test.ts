import { afterEach, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { connectDevtools } from '../../packages/helper/src/index';
import { connectDevtoolsForTest } from '../../packages/helper/src/testing';
import { isApi } from '../../packages/helper/src/integration';
import * as mock from './vscode';
const context = (mode: number) => ({ extensionMode: mode, extension: { id: 'test.owner' }, subscriptions: [] }) as unknown as vscode.ExtensionContext;
afterEach(() => { vi.restoreAllMocks(); mock.workspace.isTrusted = true; mock.env.remoteName = undefined; });
it('is inert in production, Test through normal entry, disabled builds, and untrusted or remote workspaces', async () => {
  const lookup = vi.spyOn(mock.extensions, 'getExtension');
  await connectDevtools(context(1), { enabled: true });
  await connectDevtools(context(3), { enabled: true });
  await connectDevtools(context(2), { enabled: false });
  mock.workspace.isTrusted = false; await connectDevtools(context(2), { enabled: true });
  mock.workspace.isTrusted = true; mock.env.remoteName = 'ssh-remote'; await connectDevtools(context(2), { enabled: true });
  expect(lookup).not.toHaveBeenCalled();
});
it('supports Development and the separate Test entry, disposing registered builds', async () => {
  const stop = vi.fn(), registerBuild = vi.fn(() => ({ dispose: stop }));
  const activate = vi.fn(async () => ({ apiVersion: 1, registerBuild, registerTarget: vi.fn() }));
  vi.spyOn(mock.extensions, 'getExtension').mockReturnValue({ activate });
  for (const [mode, connect] of [[2, connectDevtools], [3, connectDevtoolsForTest]] as const) {
    const integration = await connect(context(mode), { enabled: true });
    integration.registerBuild('ui', { scheme: 'file', path: '/project' } as vscode.Uri, '.dev/signal.json');
    integration.dispose();
  }
  expect(activate).toHaveBeenCalledTimes(2); expect(registerBuild).toHaveBeenCalledTimes(2); expect(stop).toHaveBeenCalledTimes(2);
});
it('reports absence, incompatibility, or activation failure once without application failure', async () => {
  for (const extension of [undefined, { activate: async () => ({ apiVersion: 2 }) }, { activate: async () => { throw new Error('activation failed'); } }]) {
    vi.spyOn(mock.extensions, 'getExtension').mockReturnValue(extension);
    const report = vi.fn(); const integration = await connectDevtools(context(2), { enabled: true, report });
    integration.registerBuild('ui', {} as vscode.Uri, '.dev/file'); integration.dispose();
    expect(report).toHaveBeenCalledTimes(1);
  }
  expect(isApi({ apiVersion: 1, registerBuild() {} })).toBe(false);
});
