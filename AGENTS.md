# Live Webview

Live Webview shortens the frontend edit/build/preview loop for extension-owned webviews. A companion VS Code extension schedules targeted reloads; an opt-in helper connects the target extension to it. The target keeps ownership of its webviews, HTML, resource URLs, application state, and message handlers.

This guide describes the current v0.1 boundary. Use the smallest complete change that solves Joel's request. Inspect the affected implementation, callers, and tests before editing. Resolve routine choices from the repo and proceed; do not turn this guide into an extra approval step. Explicit task instructions take precedence over its defaults.

## Preserve these properties

1. **Cooperation through public APIs.** The helper activates the companion in the same extension host and checks its versioned exports. Keep real webview objects in the target. Do not introduce arbitrary attachment, private APIs, or a global Reload Webview command as the normal reload path.
2. **Development integration cannot break the target.** Missing or incompatible companions leave the application usable. Keep the explicit build flag, Development-mode check, workspace-trust check, and local-host guard. Test mode has its own entry. Production builds omit the integration.
3. **A successful build is the reload boundary.** Publish only after every output is complete. Preserve per-target serialization, latest-pending revision handling, and disposal. Callback completion and frontend readiness are different facts.
4. **Keep the tool small.** Controls use a native Tree View, commands, and an Output channel. Keep process ownership in existing tasks. Message inspection, scenarios, framework HMR, remote hosts, and browser VS Code require a new request; they are not unfinished v0.1 work.

## Terms used here

| Term | Meaning |
| --- | --- |
| Owner / target extension | The extension that creates a panel or resolves a sidebar view. |
| Target | One registered live webview instance, keyed by owner extension ID plus instance ID. |
| Build group | Targets that share one successful-build signal, keyed by owner plus build ID. |
| Revision | An opaque unique build token. Order comes from publication, not token sorting. Manual reload creates its own token. |
| Companion | `packages/extension`, currently identified as `local.live-webview`. |
| Helper | `packages/helper`, currently named `@webview-dev/helper`. |
| Development Host | The VS Code window running the target extension, separate from the source-editing window. |
| Ready acknowledgement | Fixture-only evidence that a new frontend boot completed a host state round trip. |

## Start with the relevant boundary

| Work | Read first |
| --- | --- |
| Public registration API | [types.ts](packages/helper/src/types.ts), then its consumers in the helper and companion. This is the shared contract; the companion imports it as types only. |
| Activation, mode guards, panel/sidebar adapters | [integration.ts](packages/helper/src/integration.ts), [index.ts](packages/helper/src/index.ts), and [testing.ts](packages/helper/src/testing.ts). |
| Scheduling, conflicts, pause, visibility, disposal | [registry.ts](packages/extension/src/registry.ts) and [registry.test.ts](tests/unit/registry.test.ts). The registry has no runtime VS Code import; keep its scheduling logic testable without a host. |
| Signal publication and consumption | [esbuild.ts](packages/helper/src/esbuild.ts), [signal.ts](packages/extension/src/signal.ts), and [signal.test.ts](tests/unit/signal.test.ts). |
| Native controls and activation contributions | [extension.ts](packages/extension/src/extension.ts) and the companion [manifest](packages/extension/package.json). |
| Real webview HTML, CSP, state, and messaging | The fixture [host](examples/esbuild/src/extension.ts), [frontend](examples/esbuild/src/frontend.ts), [CSS](examples/esbuild/src/frontend.css), and [build script](examples/esbuild/build.mjs). |
| Host test failures or timing evidence | [run.mjs](tests/integration/run.mjs) launches hosts and joins logs; [suite.ts](tests/integration/suite.ts) asserts actual frontend acknowledgements. |
| Build or package resolution | [build.mjs](scripts/build.mjs), [package.mjs](scripts/package.mjs), [prepare-fixture.mjs](scripts/prepare-fixture.mjs), and package manifests. |

Read [README.md](README.md) for setup and the public usage contract. Read [docs/validation.md](docs/validation.md) for dated evidence and its limits, not as a promise that the current checkout still passes. [CI](.github/workflows/ci.yml) records the Linux check sequence. Root [.vscode](.vscode/launch.json) launches both extensions or the installed companion; the [fixture launch](examples/esbuild/.vscode/launch.json) supports the independent copy.

## Trace a reload

`helper/esbuild.ts` publishes a signal after output completion. `extension/signal.ts` reads and validates it. `extension/registry.ts` selects eligible targets and serializes their callbacks. The owner's callback rebuilds its HTML. The frontend then performs its own ready/state handshake. The companion does not observe that handshake in v0.1.

Shared types stay in the helper; do not add a protocol package without a separate transport requirement. Keep filesystem behavior in the signal adapter, scheduling in the registry, and VS Code presentation in the extension entry point. An interface change must reach both helper entries, the companion, and the fixture.

## Three common traps

1. **Testing the wrong host or stale bundles.** A companion installed only in the source window does not prove same-host cooperation. Run `pnpm build` after changing helper, companion, or integration-suite TypeScript and before host tests. `integration-test` rebuilds the selected fixture, but does not rebuild those other bundles. Host TypeScript changes still require a debug restart during manual development.
2. **Mistaking workspace resolution for a distributable package.** Test the helper tarball with `pnpm prepare-fixture`. The copied fixture has its own TypeScript config and pnpm workspace, and the script checks every bundled input. Preserve those checks: ancestor path aliases can silently pull source from the main workspace. Edit `examples/esbuild`, then regenerate `artifacts/fixture`; do not fix the generated copy directly.
3. **Changing the developer's running environment.** Use the isolated `.vscode-test` profiles and extension directories supplied by the runner. Do not install test packages into Joel's normal profile. Stop only processes whose handles or PIDs you captured when launching them. Never terminate all Code, Node, or esbuild processes by name or path. Do not run host suites concurrently against the same fixture; they rebuild its outputs and watch tests temporarily edit its source.

## Check all affected paths

Use this list to find omissions before finishing. Exercise the rows affected by the change; it is not a requirement to run every host mode for every edit.

| Boundary | Cases to preserve |
| --- | --- |
| Instances and builds | Both panel and resolved sidebar adapters; multiple instances on one build; another owner/build stays unaffected; conflicting registrations fail clearly. |
| Lifecycle | Visible and hidden; pause and resume; manual reload while paused; disposal during an in-flight callback; reuse of a disposed instance ID. Hidden targets must not steal focus. |
| Signals | Existing baseline without reload; missing directory; atomic replacement; malformed/oversized input; duplicate revision; burst builds; failure followed by success. A replayed success must not hide a newer build failure. |
| Integration modes | Normal Development entry; explicit Test entry; absent/incompatible companion; inert production and untrusted behavior; installed companion plus tarball helper. |
| Controls | Manifest command IDs, Tree View actions, Command Palette selection, status, logs, and the bundled Setup guide agree. Keep controls nonmodal and keyboard accessible; use text/icons, never colored edge stripes. |
| HTML and evidence | Revisioned `asWebviewUri` assets, fresh nonce, escaped attributes, strict CSP, successful host messaging, and explicit application state restoration. Do not inject into arbitrary HTML. |

## Working commands

Use Node 24 and the pnpm version pinned in [package.json](package.json). Run commands from the repository root unless stated otherwise. Keep the lockfile consistent with manifest changes.

```sh
pnpm install --frozen-lockfile
pnpm build
```

For manual work, select **Fixture + companion** and press F5, then run **Webview Fixture: Open Panels** in the new host. The launch task starts the fixture watcher. Edit the fixture frontend in the source window. Terminate the watch task when the manual session is finished.

For code changes, run `pnpm typecheck`, `pnpm lint`, and the relevant unit files. This repo is small enough for `pnpm test` when the change spans its logic. Useful focused commands:

```sh
pnpm exec vitest run tests/unit/registry.test.ts
pnpm exec vitest run tests/unit/signal.test.ts
pnpm exec vitest run tests/unit/helper.test.ts
```

After rebuilding, select host checks by what changed:

| Change | Additional verification |
| --- | --- |
| Registration, reload flow, HTML, messages, or controls | `pnpm integration-test` |
| Helper guards or activation | `pnpm integration-test --absent`, `pnpm integration-test --production --absent`, and `pnpm integration-test --untrusted` |
| Package exports, bundled files, helper resolution, or host placement | `pnpm package`, then `pnpm prepare-fixture`, then `pnpm integration-test --packaged --independent` |
| Development-mode entry or watch behavior | Refresh packages and the independent fixture as above, then `pnpm integration-test --packaged --independent --development --watch` |

The runner pins VS Code 1.74.0; the API declarations and both extension manifests must remain consistent with the tested minimum. On Linux, host tests need a display; CI uses `xvfb-run -a`. `tests/unit/vscode.ts` is a Vitest stub, not proof of real VS Code behavior. The Microsoft runner forces Test mode and disables workspace trust, so the Development and Restricted Mode cases use its downloaded executable with direct public launch flags.

Test observable results. For asynchronous UI work, wait for a revision and boot acknowledgement rather than adding a sleep to make a failing assertion pass. Mocked callback tests prove scheduling, not frontend execution. Record latency separately from correctness; do not make the local performance budgets flaky CI gates. Run final applicable checks once; repeat only failed or affected checks after further edits. Documentation-only changes need link/path and diff checks, not application tests or repackaging.

## Files, documentation, and completion

- For brand or artwork changes, read [DESIGN.md](DESIGN.md) and [art-instructions.html](art-instructions.html). Prioritize clarity, recognition, and utility; personality is a small supporting note. The approved source is `docs/branding/mark.svg`; `pnpm brand` generates the README header and packaged icon. Native controls continue to use VS Code's theme.
- Edit source, not `dist/`. Builds generate helper declarations, companion code, the integration suite, and `packages/extension/dist/setup.md` from the root README. The companion's `.vscodeignore` is an allowlist; include new runtime files explicitly.
- `artifacts/`, `.vscode-test/`, `.webview-dev/`, `dist/`, and `node_modules/` are generated or local state. Keep machine paths, signals, profiles, VSIX files, tarballs, and temporary experiments out of tracked source. Resolve deletion targets before removing any generated tree.
- Update the existing README section when setup or public behavior changes. Keep contract definitions in types and behavioral examples in tests. Add internal documentation only for a durable decision or a trap that crosses code boundaries. Update this guide when its navigation or commands become stale.
- Preserve unrelated work. No commit, push, publication, or name reservation without Joel's request. Joel selected the extension name **Live Webview** (`live-webview`). The publisher and helper package scope remain provisional; the project uses the MIT license, with Rubik under its separate OFL. This is an independent repo; do not modify or import source from the Paradox Toolkit as an incidental part of this work.
- Finish with the changed behavior, the checks actually run, and concrete remaining limits. Stop owned test processes. Treat previous sample timings and validation reports as dated evidence; do not claim Linux, keyboard, or accessibility verification without performing it.
