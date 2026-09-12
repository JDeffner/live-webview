import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const declarations = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'packages/helper/tsconfig.json'], { stdio: 'inherit', windowsHide: true });
if (declarations.status !== 0) process.exit(declarations.status ?? 1);
await build({ entryPoints: ['packages/helper/src/index.ts', 'packages/helper/src/testing.ts', 'packages/helper/src/esbuild.ts'], outdir: 'packages/helper/dist', bundle: true, platform: 'node', target: 'node16', external: ['vscode'] });
await build({ entryPoints: ['packages/extension/src/extension.ts'], outfile: 'packages/extension/dist/extension.js', bundle: true, platform: 'node', target: 'node16', external: ['vscode'] });
// Keep the full usage guide available offline when the README is shortened.
const pages = ['Home', 'Getting-started', 'Integration', 'Build-signals', 'Controls', 'State-and-reload', 'Troubleshooting', 'API-reference'];
const setup = (await Promise.all(pages.map(page => readFile(`docs/wiki/${page}.md`, 'utf8')))).join('\n\n');
await writeFile('packages/extension/dist/setup.md', setup);
await build({ entryPoints: ['tests/integration/suite.ts'], outfile: 'tests/integration/dist/suite.js', bundle: true, platform: 'node', target: 'node16', external: ['vscode', 'esbuild'] });
const result = spawnSync(process.execPath, ['examples/esbuild/build.mjs', ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.status) process.exit(result.status);
