import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { build, stop, type Plugin } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { activate, Boot } from '../../examples/esbuild/src/extension';
import { webviewDevSignal } from '../../packages/helper/src/esbuild';
type Fixture = Awaited<ReturnType<typeof activate>>;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor<T>(read: () => T | undefined, label: string): Promise<T> {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) { const result = read(); if (result) return result; await delay(25); }
  throw new Error(`Timed out: ${label}`);
}
export async function run() {
  const extension = vscode.extensions.getExtension<Fixture>('local.live-webview-fixture')!;
  const fixture = await extension.activate();
  const root = extension.extensionPath;
  const source = await readFile(join(root, 'src/frontend.ts'), 'utf8');
  const cssSource = await readFile(join(root, 'src/frontend.css'), 'utf8');
  const signalPath = join(root, '.webview-dev/editor-ui.json');
  const plugin = webviewDevSignal({ projectRoot: root, signalPath: '.webview-dev/editor-ui.json', buildId: 'editor-ui' });
  const frontendBuild = async (marker: string, css = 'initial', signal = true, invalid = false) => {
    let buildMs = 0;
    const started = Date.now();
    const cssPlugin: Plugin = { name: 'fixture-css', setup(api) {
      api.onLoad({ filter: /frontend\.css$/ }, () => ({ contents: cssSource.replace('--fixture-marker: initial', `--fixture-marker: ${css}`), loader: 'css' }));
      api.onEnd(() => { buildMs = Date.now() - started; });
    } };
    const result = build({ stdin: { contents: invalid ? 'const =' : source.replace('initial marker', marker), resolveDir: join(root, 'src'), loader: 'ts' }, outfile: join(root, 'dist/frontend.js'), bundle: true, logLevel: 'silent', plugins: [cssPlugin, ...(signal ? [plugin] : [])] });
    if (invalid) await assert.rejects(result); else await result;
    const metadata = signal ? JSON.parse(await readFile(signalPath, 'utf8')) : {};
    return { revision: metadata.revision as string, status: metadata.status as string, buildMs, published: Date.now() };
  };
  const command = (name: string, id: string) => vscode.commands.executeCommand(`webviewDev.${name}Target`, JSON.stringify(['local.live-webview-fixture', id]));
  const generation = (id: string, revision: string) => waitFor(() => { const boot = fixture.boots.get(id); return boot?.revision === revision ? boot : undefined; }, `${id} ready at ${revision}`);
  const newBoot = (id: string, previous: Boot) => waitFor(() => { const boot = fixture.boots.get(id); return boot && boot.boot !== previous.boot ? boot : undefined; }, `${id} new boot`);
  try {
    assert.equal(fixture.mode, process.env.FIXTURE_DEVELOPMENT === '1' ? vscode.ExtensionMode.Development : vscode.ExtensionMode.Test);
    fixture.open('one'); fixture.open('two', vscode.ViewColumn.Two);
    const a = await waitFor(() => fixture.boots.get('one'), 'panel one boot');
    const b = await waitFor(() => fixture.boots.get('two'), 'panel two boot');
    assert.equal(a.session, fixture.session);
    if (process.env.FIXTURE_ABSENT === '1' || process.env.FIXTURE_PRODUCTION === '1' || process.env.FIXTURE_UNTRUSTED === '1') {
      if (process.env.FIXTURE_ABSENT === '1') assert.equal(vscode.extensions.getExtension('local.live-webview'), undefined);
      if (process.env.FIXTURE_UNTRUSTED === '1') assert.equal(vscode.workspace.isTrusted, false);
      await frontendBuild('inert change'); await delay(350);
      assert.equal(fixture.boots.get('one')!.boot, a.boot);
      await fixture.setInput('one', 'still usable');
      await waitFor(() => fixture.boots.get('one')?.value === 'still usable', 'application still handles messages');
      console.log('INERT PASS: application boots and handles messages without active integration');
      return;
    }
    const api = await vscode.extensions.getExtension('local.live-webview')!.activate(); assert.equal(api.apiVersion, 1);
    await vscode.commands.executeCommand('webviewDev.setup');
    assert.ok(vscode.window.activeTextEditor?.document.getText().includes('Signal successful builds'));
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    fixture.open('two', vscode.ViewColumn.Two);
    await frontendBuild('manual changed', 'initial', false);
    await command('reload', 'one'); const manual = await newBoot('one', a);
    assert.equal(manual.marker, 'manual changed'); assert.equal(manual.session, a.session); assert.equal(fixture.boots.get('two')!.boot, b.boot);
    fixture.open('other', vscode.ViewColumn.Three, 'other-ui');
    const other = await waitFor(() => fixture.boots.get('other'), 'other build boot');
    await vscode.commands.executeCommand('webviewFixture.sidebar.focus');
    await waitFor(() => fixture.boots.get('sidebar'), 'sidebar boot');
    const changed = await frontendBuild('shared changed', 'changed');
    for (const id of ['one', 'two', 'sidebar']) { const boot = await generation(id, changed.revision); assert.equal(boot.marker, 'shared changed'); assert.equal(boot.css, 'changed'); assert.equal(boot.session, fixture.session); }
    assert.equal(fixture.boots.get('other')!.boot, other.boot);
    const beforeDuplicate = fixture.live.get('one')!.reloads;
    const duplicate = await readFile(signalPath); await writeFile(signalPath, duplicate); await delay(200);
    assert.equal(fixture.live.get('one')!.reloads, beforeDuplicate);
    await fixture.setInput('one', 'a typed value'); await waitFor(() => fixture.boots.get('one')?.value === 'a typed value', 'DOM input -> host');
    const restored = await frontendBuild('state restored'); const restoredBoot = await generation('one', restored.revision);
    assert.equal(restoredBoot.value, 'a typed value'); assert.equal(restoredBoot.selection, 13);
    const failure = await frontendBuild('', 'initial', true, true); assert.equal(failure.status, 'error'); await delay(200);
    assert.equal(fixture.boots.get('one')!.boot, restoredBoot.boot);
    await fixture.setInput('one', 'usable after failure'); await waitFor(() => fixture.boots.get('one')?.value === 'usable after failure', 'old UI remains usable');
    const recovery = await frontendBuild('recovered'); await generation('one', recovery.revision);
    await command('pause', 'one'); const paused = fixture.live.get('one')!.reloads;
    await frontendBuild('paused first'); const newest = await frontendBuild('paused newest'); await generation('two', newest.revision);
    assert.equal(fixture.live.get('one')!.reloads, paused); await command('resume', 'one'); await generation('one', newest.revision);
    fixture.open('cover', vscode.ViewColumn.Two, 'other-ui'); await waitFor(() => fixture.boots.get('cover'), 'cover boot');
    await waitFor(() => !fixture.live.get('two')!.view.visible, 'second panel hidden'); const hidden = fixture.live.get('two')!.reloads;
    const hiddenBuild = await frontendBuild('hidden latest'); await generation('one', hiddenBuild.revision); assert.equal(fixture.live.get('two')!.reloads, hidden);
    fixture.open('two', vscode.ViewColumn.Two); await generation('two', hiddenBuild.revision);
    await frontendBuild('burst one'); await frontendBuild('burst two'); const burst = await frontendBuild('burst last');
    for (const id of ['one', 'two', 'sidebar']) assert.equal((await generation(id, burst.revision)).marker, 'burst last');
    // Sequential samples measure actual ready acknowledgements. Timing is reported, never a CI gate.
    const samples = [];
    for (let index = 0; index < 20; index++) {
      const result = await frontendBuild(`sample ${index}`); const boot = await generation('one', result.revision);
      samples.push({ ...result, callbackStarted: fixture.live.get('one')!.starts.get(result.revision), ready: boot.received, boot: boot.boot });
    }
    if (process.env.FIXTURE_RESULTS) { await mkdir(join(process.env.FIXTURE_RESULTS, '..'), { recursive: true }); await writeFile(process.env.FIXTURE_RESULTS, JSON.stringify({ hostVersion: vscode.version, mode: fixture.mode, samples }, null, 2)); }
    if (process.env.FIXTURE_WATCH === '1') {
      await writeFile(join(root, 'src/frontend.ts'), source.replace('initial marker', 'watch saved marker'));
      await waitFor(() => fixture.boots.get('one')?.marker === 'watch saved marker', 'JavaScript save through supplied watch script');
      await writeFile(join(root, 'src/frontend.css'), cssSource.replace('--fixture-marker: initial', '--fixture-marker: watch-saved'));
      await waitFor(() => fixture.boots.get('one')?.css === 'watch-saved', 'CSS save through supplied watch script');
      console.log('WATCH PASS: saved JavaScript and CSS through fixture build.mjs --watch');
    }
    console.log('INTEGRATION PASS: JS/CSS, shared builds, isolated manual reload, sidebar, failure/recovery, input/selection restoration, pause, hidden/reveal, 20 boot samples');
  } finally {
    for (const item of [...fixture.live.values()]) if ('reveal' in item.view) item.view.dispose();
    if (process.env.FIXTURE_WATCH === '1') { await writeFile(join(root, 'src/frontend.ts'), source); await writeFile(join(root, 'src/frontend.css'), cssSource); }
    await frontendBuild('initial marker', 'initial', false);
    stop();
  }
}
