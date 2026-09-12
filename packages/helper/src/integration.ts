import * as vscode from 'vscode';
import type { DevtoolsApiV1, TargetRegistration } from './types';

export interface IntegrationOptions {
  enabled: boolean;
  companionId?: string;
  report?: (message: string) => void;
}
export interface TargetOptions {
  instanceId: string;
  viewType: string;
  label: string;
  buildId: string;
  reload: TargetRegistration['reload'];
}
export interface Integration extends vscode.Disposable {
  registerBuild(buildId: string, projectRoot: vscode.Uri, signalPath: string): vscode.Disposable;
  registerPanel(panel: vscode.WebviewPanel, options: TargetOptions): vscode.Disposable;
  registerView(view: vscode.WebviewView, options: TargetOptions): vscode.Disposable;
}
const noop = { dispose() {} };
const inert: Integration = { ...noop, registerBuild: () => noop, registerPanel: () => noop, registerView: () => noop };

export async function connect(context: vscode.ExtensionContext, options: IntegrationOptions, mode: vscode.ExtensionMode): Promise<Integration> {
  if (!options.enabled || context.extensionMode !== mode || !vscode.workspace.isTrusted || vscode.env.remoteName) return inert;
  let reported = false;
  const report = (error: unknown) => {
    if (reported) return;
    reported = true;
    try { (options.report ?? console.warn)(`Live Webview: ${error instanceof Error ? error.message : String(error)}. The target remains available.`); } catch { /* Diagnostics must not break the application. */ }
  };
  const resources = new Set<vscode.Disposable>();
  let disposed = false;
  const own = (resource: vscode.Disposable, lifecycle?: vscode.Event<void>) => {
    const handle = new vscode.Disposable(() => { resources.delete(handle); close?.dispose(); resource.dispose(); });
    resources.add(handle);
    const close = lifecycle?.(() => handle.dispose());
    return handle;
  };
  try {
    const id = options.companionId ?? 'local.live-webview';
    const extension = vscode.extensions.getExtension(id);
    if (!extension) throw new Error(`Install ${id} in this Extension Development Host to enable reload`);
    const api: unknown = await extension.activate();
    if (!isApi(api)) throw new Error(`Companion ${id} has an incompatible API (expected v1)`);
    const safely = (action: () => vscode.Disposable, lifecycle?: vscode.Event<void>) => {
      if (disposed || !vscode.workspace.isTrusted) return noop;
      try { return own(action(), lifecycle); } catch (error) { report(error); return noop; }
    };
    const register = (view: vscode.WebviewView | vscode.WebviewPanel, input: TargetOptions, event: vscode.Event<void>) => safely(() => api.registerTarget({ ...input, ownerExtensionId: context.extension.id, onDidDispose: view.onDidDispose, isVisible: () => view.visible, onDidChangeVisibility: event }), view.onDidDispose);
    const integration: Integration = {
      dispose() { disposed = true; for (const item of [...resources]) item.dispose(); },
      registerBuild: (buildId, root, signalPath) => safely(() => {
        if (root.scheme !== 'file' || !signalPath || /^(?:[a-z]:|[/\\])/i.test(signalPath) || signalPath.split(/[/\\]/).includes('..')) throw new Error('Use a local project root and a relative signal path within it');
        return api.registerBuild({ ownerExtensionId: context.extension.id, buildId, signalUri: vscode.Uri.joinPath(root, ...signalPath.split(/[/\\]/)) });
      }),
      registerPanel: (panel, input) => register(panel, input, listener => panel.onDidChangeViewState(() => listener())),
      registerView: (view, input) => register(view, input, view.onDidChangeVisibility),
    };
    context.subscriptions.push(integration);
    return integration;
  } catch (error) { report(error); return inert; }
}

export function isApi(value: unknown): value is DevtoolsApiV1 {
  if (typeof value !== 'object' || value === null) return false;
  const api = value as Partial<DevtoolsApiV1>;
  return api.apiVersion === 1 && typeof api.registerBuild === 'function' && typeof api.registerTarget === 'function';
}
