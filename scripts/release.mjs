import { readFile, appendFile } from 'node:fs/promises';

// Validate the release before any build or upload. Never interpolate tag text into a shell.
const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const release = event.release;
const manifest = JSON.parse(await readFile('packages/extension/package.json', 'utf8'));
if (event.action !== 'published' || !release || release.draft !== false || typeof release.prerelease !== 'boolean') {
  throw new Error('Expected a published GitHub release with an explicit prerelease flag.');
}
if (typeof release.tag_name !== 'string' || !/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release.tag_name)) {
  throw new Error('Use a numeric vMAJOR.MINOR.PATCH tag for both channels. Select the GitHub prerelease checkbox instead of adding a -beta suffix.');
}
const version = release.tag_name.slice(1);
if (manifest.version !== version) throw new Error(`Release ${release.tag_name} does not match packages/extension/package.json version ${manifest.version}. Update the manifest before tagging.`);
if (manifest.publisher !== 'JDeffner' || manifest.name !== 'live-webview') throw new Error('Expected Marketplace extension JDeffner.live-webview.');
await appendFile(process.env.GITHUB_OUTPUT, `version=${version}\npre_release=${release.prerelease}\nvsix=artifacts/live-webview-${version}.vsix\n`);
console.log(`Validated JDeffner.live-webview ${version} for the ${release.prerelease ? 'prerelease' : 'stable'} channel.`);
