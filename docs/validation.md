# Local validation, 12 September 2026

v0.1 was exercised on Windows with VS Code 1.74.0, Node 24.12.0, and pnpm 11.25.0. This section records the original local validation before the GitHub release. No Marketplace publisher or npm package name was reserved.

The extension is now named **Live Webview**, with local ID `local.live-webview` and artifact `artifacts/live-webview-0.1.0.vsix`. After the rename, typecheck, lint, the 3 helper tests, and `pnpm integration-test --packaged --independent` passed with the rebuilt VSIX and helper tarball. The measurements below describe the original validation run.

| Command | Result |
| --- | --- |
| `pnpm typecheck` | Passed, helper declarations and all TypeScript |
| `pnpm lint` | Passed |
| `pnpm test` | Passed, 15 tests in 3 files |
| `pnpm package` | Created the self-contained VSIX and helper tarball |
| `pnpm prepare-fixture` | Installed the tarball in an independent copy; every bundled input resolved inside that copy |
| `pnpm integration-test` | Passed, both extensions in a real Test-mode host |
| `pnpm integration-test --packaged --independent` | Passed, installed VSIX and tarball fixture in a real Test-mode host |
| `pnpm integration-test --packaged --independent --development --watch` | Passed, installed VSIX, Development-mode helper, actual saved JavaScript and CSS through the supplied watch script |
| `pnpm integration-test --absent` | Passed, useful development message and working application |
| `pnpm integration-test --production --absent` | Passed, working application and no integration code in the production host bundle |
| `pnpm integration-test --untrusted` | Passed, actual Restricted Mode, working application, no signal-triggered reload |
| `git diff --check` | Passed |

The real-host suite observes fresh frontend boot tokens and state round trips. It covers two panels on a shared build, a sidebar, a separate-build panel, targeted manual reload, JavaScript and CSS output, duplicate signals, burst builds, actual esbuild failure/recovery, pause/resume, hide/reveal, setup-command content, and input/selection restoration. Unit tests cover pending async callback serialization, disposal and ID reuse, callback failure isolation, missing and replaced signal directories, malformed and oversized signals, runtime API checks, and helper mode/trust guards.

## Twenty local reload samples

These samples are from the packaged companion with the independent tarball fixture in **Development mode**, with the supplied watcher running. Receipt comes from the companion's JSON log. Readiness is the fixture's acknowledgement after a host state round trip. Build time ends before signal publication. All values are milliseconds.

| Measurement | Minimum | Median | p95 | Maximum |
| --- | ---: | ---: | ---: | ---: |
| Frontend build | 6 | 15 | 53 | 90 |
| Signal receipt to callback start | 0 | 1 | 1 | 1 |
| Signal receipt to frontend ready | 64 | 85 | 199 | 396 |

All 20 samples met the proposed 500 ms callback-start and 1000 ms readiness budgets. These are local measurements of a small fixture, not general guarantees. The separate final packaged Test-mode run measured 48–84 ms to readiness. Raw samples are in `artifacts/samples-packaged-independent-development-watch.json` and `artifacts/samples-packaged-independent.json`.

## Setup and limits

The independent scripted route has three commands: `pnpm package`, `pnpm prepare-fixture`, and the packaged integration-test command. The manual source route has two shell commands (`pnpm install --frozen-lockfile`, `pnpm build`), then F5, the fixture's Open Panels command, and a source save. Sidebar testing adds one expansion in Explorer. The checked-in launch configuration starts the existing watch task.

At the time of this original run, Linux CI coverage was configured but had not been executed. Manual F5 clicks and physical keyboard input were not tested; automated Windows hosts used the same public launch boundaries, and the fixture dispatched a DOM input event for state-restoration assertions. The old pinned host printed occasional navigation/stream teardown warnings, and its runner printed Node deprecation warnings. The listed tests completed with exit code 0.

The remaining validation limits are Linux execution and a human keyboard/accessibility pass. Remote hosts, browser VS Code, arbitrary attachment, message inspection, sample scenarios, and framework HMR are outside this version. Host-side code changes still require a debug restart.

## Branded GitHub release check

The approved logo was exported to a canonical SVG, a 1280 ? 400 README header, and a 256px extension icon. The PNG exports were visually inspected. Both screens retain the approved 3:2 content areas and matching heading/text proportions.

For the branded MIT release, typecheck, lint, all 15 unit tests, VSIX/tarball packaging, and the packaged independent Windows host test passed. The final archive was checked for the icon, MIT license, and correct README/setup links; the tarball includes its MIT license. The final 20 Test-mode samples measured 0?1 ms from signal receipt to callback start and 29?66 ms to frontend readiness. These samples are separate from the Development-mode measurements above.

The GitHub Actions workflow runs Linux host checks on each push. Its run results are the source of truth for Linux validation. A human keyboard/accessibility pass remains unverified.

## Wiki and Marketplace workflow, 13 September 2026

Source version 0.1.1 prepares the JDeffner.live-webview identity and a release-triggered Marketplace workflow. No new release or Marketplace upload was made during these checks. The wiki pages also supply the bundled offline Setup guide.

Typecheck, lint, and all 26 unit tests passed. The 11 new release tests cover stable/prerelease selection, invalid tags, version mismatch, drafts, incomplete events, and edits. Actionlint 1.7.12 accepted both workflows. Local documentation and wiki links resolved to existing files/pages.

Both stable and prerelease VSIX packages were created and inspected for the expected prerelease metadata, JDeffner publisher, 0.1.1 version, and complete offline guide. Windows VS Code 1.74.0 real-host checks passed for the two-extension launch, the packaged prerelease with the independent 0.1.1 helper tarball, companion absence, production without the companion, and Restricted Mode. The packaged run recorded 20 successful frontend boots and host round trips. Owned test hosts exited.

Actual Marketplace authentication and upload remain untested because VSCE_PAT will be supplied later. The release workflow also requires a new matching numeric tag; the existing v0.1.0 tag predates it. Linux results for this change are available in GitHub Actions after the source push. The human keyboard/accessibility pass remains unverified.

## Stable 1.0.0 release checks, 17 September 2026

The companion and helper are versioned 1.0.0. The extension publisher is JDeffner, the extension ID is JDeffner.live-webview, and the registration API remains v1. This promotes the existing targeted-reload scope to a stable release; it does not add framework HMR or message inspection. The earlier reports above describe their dated checkouts. Marketplace authentication and prerelease uploads subsequently succeeded for 0.1.1 and 0.1.2.

The final Windows source passed `pnpm install --frozen-lockfile`, `pnpm package` (including build), `pnpm typecheck`, `pnpm lint`, all 26 unit tests, and `pnpm prepare-fixture`. Actionlint accepted both workflows, and the local documentation/wiki link checker passed. The stable VSIX was inspected for JDeffner.live-webview 1.0.0, absence of the prerelease flag, and the bundled README, offline guide, icon, license, and extension entry point. The helper tarball declares version 1.0.0 and the expected main, testing, and esbuild exports.

All six Windows host checks passed on VS Code 1.74.0: the two-extension launch; packaged companion with the independent tarball fixture; absent companion; production without the companion; untrusted workspace; and packaged independent Development mode with the real watcher. The production check verifies that development integration is omitted from its host bundle. Host tests observe real frontend boot acknowledgements and state round trips. Owned hosts and watchers exited after each run.

The Development/watch run recorded 20 samples. Build time was 2–9 ms (median 4, p95 5); signal receipt to callback start was 0–1 ms (median 0, p95 1); signal receipt to frontend readiness was 28–51 ms (median 45, p95 50). These small-fixture measurements meet the local design budgets and are not universal timing guarantees. Raw local evidence is in `artifacts/samples-packaged-independent-development-watch.json`; command logs use `artifacts/stable-1.0.0-*.log`.

Linux checks run separately in [GitHub Actions](https://github.com/JDeffner/live-webview/actions/workflows/ci.yml). The [Marketplace workflow](https://github.com/JDeffner/live-webview/actions/workflows/marketplace.yml) rebuilds, checks, and tests the installed package before upload. Release metadata and the uploaded VSIX must both use the stable channel. A human keyboard/screen-reader accessibility pass remains unverified; the automated host checks do not establish it.
