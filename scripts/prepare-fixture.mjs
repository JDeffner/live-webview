import { cp, readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { basename, resolve, relative } from 'node:path';
import { createRequire } from 'node:module';
import { pnpm } from './process.mjs';
const root = resolve('artifacts/fixture');
await mkdir(root, { recursive: true });
await cp('examples/esbuild', root, { recursive: true, filter: path => !['node_modules', 'dist', '.webview-dev'].includes(basename(path)) });
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
manifest.dependencies['@webview-dev/helper'] = 'file:../webview-dev-helper-0.1.0.tgz';
await writeFile(resolve(root, 'package.json'), JSON.stringify(manifest, null, 2));
await writeFile(resolve(root, 'pnpm-workspace.yaml'), 'packages: []\nallowBuilds:\n  esbuild: true\n');
pnpm(['install'], root);
const require = createRequire(resolve(root, 'package.json'));
const helperPath = await realpath(require.resolve('@webview-dev/helper'));
if (relative(root, helperPath).startsWith('..')) throw new Error(`Fixture resolved a workspace link: ${helperPath}`);
pnpm(['build', '--test'], root);
const metadata = JSON.parse(await readFile(resolve(root, 'dist/host-meta.json'), 'utf8'));
for (const input of Object.keys(metadata.inputs)) {
  if (relative(root, await realpath(resolve(root, input))).startsWith('..')) throw new Error(`Fixture bundle used a source outside its own copy: ${input}`);
}
console.log(`Independent helper resolved at ${helperPath}`);
