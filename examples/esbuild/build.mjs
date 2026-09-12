import { build, context } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { webviewDevSignal } from '@webview-dev/helper/esbuild';
const root = fileURLToPath(new URL('.', import.meta.url));
const production = process.argv.includes('--production');
const host = await build({ absWorkingDir: root, entryPoints: ['src/extension.ts'], outfile: 'dist/extension.js', bundle: true, platform: 'node', target: 'node16', external: ['vscode'], define: { __DEV__: String(!production), __TEST__: String(process.argv.includes('--test')) }, minify: production, metafile: true });
await writeFile(join(root, 'dist/host-meta.json'), JSON.stringify(host.metafile, null, 2));
const options = { absWorkingDir: root, entryPoints: ['src/frontend.ts'], outfile: 'dist/frontend.js', bundle: true, platform: 'browser', target: 'es2020', plugins: production ? [] : [webviewDevSignal({ projectRoot: root, signalPath: '.webview-dev/editor-ui.json', buildId: 'editor-ui' })] };
await build({ ...options, outfile: 'dist/other-frontend.js', plugins: production ? [] : [webviewDevSignal({ projectRoot: root, signalPath: '.webview-dev/other-ui.json', buildId: 'other-ui' })] });
if (process.argv.includes('--watch')) {
  const ctx = await context(options); await ctx.watch(); console.log('Fixture watch ready');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await ctx.dispose(); process.exit(0); });
}
else await build(options);
