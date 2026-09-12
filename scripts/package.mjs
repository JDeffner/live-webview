import { createVSIX } from '@vscode/vsce';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pnpm } from './process.mjs';
pnpm(['build']);
await mkdir('artifacts', { recursive: true });
await createVSIX({ cwd: 'packages/extension', packagePath: 'artifacts/live-webview-0.1.0.vsix', dependencies: false, allowMissingRepository: true });
pnpm(['pack', '--out', resolve('artifacts/webview-dev-helper-0.1.0.tgz')], resolve('packages/helper'));
