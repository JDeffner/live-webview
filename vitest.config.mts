import { defineConfig } from 'vitest/config';
export default defineConfig({ resolve: { alias: { vscode: new URL('./tests/unit/vscode.ts', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') } }, test: { include: ['tests/unit/**/*.test.ts'] } });
