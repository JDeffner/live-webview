import { spawnSync } from 'node:child_process';
export function pnpm(args, cwd = process.cwd()) {
  if (!process.env.npm_execpath) throw new Error('Run this script through pnpm');
  const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw new Error(`pnpm ${args.join(' ')} failed (${result.status})`);
}
