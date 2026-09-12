import * as vscode from 'vscode';
import type { DevtoolsApiV1 } from '@webview-dev/helper';
import { Registry, type Target, keyOf } from './registry';

type Row = { owner: string } | Target;
const plain = (text: string) => Array.from(text.slice(0, 2000), char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? ' ' : char).join('');
export function activate(context: vscode.ExtensionContext): DevtoolsApiV1 {
  const output = vscode.window.createOutputChannel('Live Webview');
  const change = new vscode.EventEmitter<Row | undefined>();
  const registry = new Registry(() => change.fire(undefined), record => output.appendLine(JSON.stringify({ time: new Date().toISOString(), ...record })));
  const active = () => vscode.workspace.isTrusted && !vscode.env.remoteName;
  const tree = vscode.window.createTreeView<Row>('webviewDev.targets', { treeDataProvider: {
    onDidChangeTreeData: change.event,
    getChildren: row => row && 'owner' in row ? [...registry.targets.values()].filter(item => item.input.ownerExtensionId === row.owner) : row ? [] : [...new Set([...registry.targets.values()].map(item => item.input.ownerExtensionId))].map(owner => ({ owner })),
    getTreeItem: row => {
      if ('owner' in row) return new vscode.TreeItem(plain(row.owner), vscode.TreeItemCollapsibleState.Expanded);
      const item = new vscode.TreeItem(plain(row.input.label));
      item.id = row.key; item.description = registry.status(row);
      item.contextValue = row.paused ? 'targetPaused' : 'targetWatching';
      item.iconPath = new vscode.ThemeIcon(row.error ? 'error' : row.paused ? 'debug-pause' : row.running ? 'sync~spin' : 'browser');
      item.tooltip = plain(`${row.input.ownerExtensionId} / ${row.input.instanceId}\nBuild: ${row.input.buildId}\n${row.error ?? registry.builds.get(keyOf(row.input.ownerExtensionId, row.input.buildId))?.error ?? registry.status(row)}`);
      return item;
    },
  } });
  tree.message = !vscode.workspace.isTrusted ? 'Reload is disabled in Restricted Mode. Trust this workspace to enable development integration.' : vscode.env.remoteName ? 'v0.1 supports local desktop extension hosts only.' : undefined;
  const select = async (value: unknown) => {
    if (typeof value === 'string') return registry.targets.get(value);
    if (value && typeof value === 'object' && 'key' in value && typeof value.key === 'string') return registry.targets.get(value.key);
    const items = [...registry.targets.values()].map(target => ({ label: plain(target.input.label), description: plain(`${target.input.ownerExtensionId} / ${target.input.instanceId}`), target }));
    return (await vscode.window.showQuickPick(items, { placeHolder: 'Select a registered webview' }))?.target;
  };
  const command = (id: string, action: (target: Target) => void) => vscode.commands.registerCommand(id, async value => { if (!active()) return; const target = await select(value); if (target) action(target); });
  context.subscriptions.push(output, change, registry, tree,
    command('webviewDev.reloadTarget', target => registry.manual(target.key)),
    command('webviewDev.pauseTarget', target => registry.pause(target.key, true)),
    command('webviewDev.resumeTarget', target => registry.pause(target.key, false)),
    vscode.commands.registerCommand('webviewDev.openLogs', () => output.show(true)),
    vscode.commands.registerCommand('webviewDev.setup', async () => { const document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(context.extensionUri, 'dist', 'setup.md')); await vscode.window.showTextDocument(document); }),
    vscode.workspace.onDidGrantWorkspaceTrust(() => { tree.message = undefined; change.fire(undefined); }),
  );
  return {
    apiVersion: 1,
    registerBuild: input => active() ? registry.registerBuild(input) : new vscode.Disposable(() => {}),
    registerTarget: input => active() ? registry.registerTarget(input) : new vscode.Disposable(() => {}),
  };
}
