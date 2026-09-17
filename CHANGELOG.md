# Changelog

## 1.0.0

First stable release of Live Webview, published as `JDeffner.live-webview`. The companion and helper are versioned `1.0.0`; the public registration API remains v1.

- Reload registered panels and sidebar views after successful frontend builds, without restarting the extension host.
- Reload one target, pause and resume automatic reload, and inspect build and callback logs through native VS Code controls.
- Share a build across multiple views, defer hidden-view updates until reveal, and serialize callbacks while keeping the latest pending revision.
- Integrate through an opt-in helper and esbuild adapter. The target keeps ownership of HTML, resource URLs, messages, and application state.
- Include the updated Marketplace guide, informative banner, and social preview.

Supports local desktop VS Code 1.74 or newer with a Node extension host and trusted workspace. Host-code changes still require a debug restart. The helper remains a release tarball, not an npm package. Framework HMR, message inspection, remote hosts, and browser VS Code are outside this release.
