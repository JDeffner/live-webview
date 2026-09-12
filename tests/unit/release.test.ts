import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(readFileSync('packages/extension/package.json', 'utf8'));
const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
function validate(release: unknown, action = 'published') {
  const directory = mkdtempSync(join(tmpdir(), 'live-webview-release-'));
  directories.push(directory);
  const eventPath = join(directory, 'event.json'), outputPath = join(directory, 'output');
  writeFileSync(eventPath, JSON.stringify({ action, release }));
  const result = spawnSync(process.execPath, [resolve('scripts/release.mjs')], {
    env: { ...process.env, GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: outputPath }, encoding: 'utf8', windowsHide: true,
  });
  return { ...result, output: result.status === 0 ? readFileSync(outputPath, 'utf8') : '' };
}

it.each([false, true])('selects the GitHub release channel (prerelease=%s)', prerelease => {
  const result = validate({ tag_name: `v${manifest.version}`, prerelease, draft: false });
  expect(result.status).toBe(0);
  expect(result.output).toContain(`pre_release=${prerelease}\n`);
  expect(result.output).toContain(`vsix=artifacts/live-webview-${manifest.version}.vsix\n`);
});

it.each(['v0.1.0-beta.1', 'v01.1.0', '0.1.0', 'v1.2.3\nmalicious=value'])('rejects unsupported release tag %s', tag_name => {
  const result = validate({ tag_name, prerelease: true, draft: false });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('numeric vMAJOR.MINOR.PATCH');
});

it('rejects a tag that does not match the packaged version', () => {
  const result = validate({ tag_name: 'v999.0.0', prerelease: false, draft: false });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('does not match');
});

it.each([
  { tag_name: `v${manifest.version}`, prerelease: false, draft: true },
  { tag_name: `v${manifest.version}`, draft: false },
  undefined,
])('rejects drafts and incomplete events', release => {
  expect(validate(release).status).not.toBe(0);
});

it('rejects an edit event so it cannot silently switch a published version channel', () => {
  expect(validate({ tag_name: `v${manifest.version}`, prerelease: false, draft: false }, 'edited').status).not.toBe(0);
});
