import eslint from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'artifacts/**', '.vscode-test/**'] },
  eslint.configs.recommended, ...ts.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly' } } },
);
