import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';
import type { Integration } from '@webview-dev/helper';

declare const __DEV__: boolean;
declare const __TEST__: boolean;
export interface Boot {
  id: string; boot: string; revision: string; marker: string; css: string; value: string; selection: number; session: string; received: number;
}
interface Live { view: vscode.WebviewPanel | vscode.WebviewView; revision: string; value: string; selection: number; reloads: number; starts: Map<string, number> }

export async function activate(context: vscode.ExtensionContext) {
  const session = randomUUID();
  const live = new Map<string, Live>();
  const boots = new Map<string, Boot>();
  const events = new vscode.EventEmitter<Boot>();
  let integration: Integration | undefined;
  if (__DEV__) {
    const options = { enabled: true };
    integration = __TEST__
      ? await (await import('@webview-dev/helper/testing')).connectDevtoolsForTest(context, options)
      : await (await import('@webview-dev/helper')).connectDevtools(context, options);
    integration.registerBuild('editor-ui', context.extensionUri, '.webview-dev/editor-ui.json');
    integration.registerBuild('other-ui', context.extensionUri, '.webview-dev/other-ui.json');
  }
  const attach = (id: string, view: Live['view'], buildId: string) => {
    const state: Live = { view, revision: 'initial', value: '', selection: 0, reloads: 0, starts: new Map() };
    live.set(id, state);
    view.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')] };
    const render = (revision: string) => {
      state.revision = revision;
      state.starts.set(revision, Date.now());
      state.reloads++;
      const nonce = randomUUID().replace(/-/g, '');
      const asset = (name: string) => view.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', buildId === 'other-ui' ? `other-${name}` : name)).with({ query: `revision=${encodeURIComponent(revision)}` }).toString();
      const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
      view.webview.html = `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${view.webview.cspSource}; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${escape(asset('frontend.css'))}"></head><body data-revision="${escape(revision)}" data-id="${escape(id)}"><h1>Webview fixture</h1><p id="marker"></p><label for="value">Restored value</label><input id="value"><p id="roundtrip">Connecting to host</p><script nonce="${nonce}" src="${escape(asset('frontend.js'))}"></script></body></html>`;
    };
    context.subscriptions.push(view.webview.onDidReceiveMessage(async message => {
      if (message.type === 'ready') await view.webview.postMessage({ type: 'state', value: state.value, selection: state.selection, session, boot: message.boot });
      if (message.type === 'input' && message.revision === state.revision && typeof message.value === 'string' && message.value.length <= 20000 && Number.isInteger(message.selection) && message.selection >= 0 && message.selection <= message.value.length) { state.value = message.value; state.selection = message.selection; }
      if (message.type === 'ack' && message.revision === state.revision) {
        const boot: Boot = { ...message, id, session, received: Date.now() };
        boots.set(id, boot); events.fire(boot);
      }
    }), view.onDidDispose(() => { live.delete(id); boots.delete(id); }));
    render('initial');
    const options = { instanceId: id, viewType: 'webviewFixture.panel', label: `Fixture ${id}`, buildId, reload: render };
    if ('onDidChangeViewState' in view) integration?.registerPanel(view, options);
    else integration?.registerView(view, options);
    return state;
  };
  let counter = 0;
  const open = (id = `panel-${++counter}`, column = vscode.ViewColumn.One, buildId = 'editor-ui') => {
    const existing = live.get(id);
    if (existing && 'reveal' in existing.view) { existing.view.reveal(column); return existing; }
    const panel = vscode.window.createWebviewPanel('webviewFixture.panel', `Fixture ${id}`, column, { enableScripts: true, retainContextWhenHidden: true });
    return attach(id, panel, buildId);
  };
  context.subscriptions.push(events, vscode.commands.registerCommand('webviewFixture.open', () => { open('one'); open('two', vscode.ViewColumn.Two); }), vscode.window.registerWebviewViewProvider('webviewFixture.sidebar', { resolveWebviewView: view => { attach('sidebar', view, 'editor-ui'); } }));
  // Fixture-only exports provide observable real webview acknowledgements. No shipped companion test command.
  if (__DEV__ && !__TEST__ && process.env.FIXTURE_PROBE_SUITE) {
    // Only the isolated Development-mode test launch supplies these paths.
    setTimeout(async () => {
      const { writeFile } = await import('node:fs/promises');
      try {
        const { pathToFileURL } = await import('node:url');
        const suite = await import(pathToFileURL(process.env.FIXTURE_PROBE_SUITE!).href) as { run(): Promise<void> };
        await suite.run();
        await writeFile(process.env.FIXTURE_PROBE_RESULT!, JSON.stringify({ passed: true }));
      } catch (error) { await writeFile(process.env.FIXTURE_PROBE_RESULT!, JSON.stringify({ passed: false, error: String(error) })); }
      finally { await vscode.commands.executeCommand('workbench.action.quit'); }
    }, 0);
  }
  return { session, boots, live, onBoot: events.event, open,
    setInput: (id: string, value: string) => live.get(id)?.view.webview.postMessage({ type: 'test-input', value }),
    mode: context.extensionMode,
  };
}
