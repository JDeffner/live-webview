# API reference

## v1 API behavior

The companion's `activate()` exports `DevtoolsApiV1`, defined in [types.ts](https://github.com/JDeffner/live-webview/blob/main/packages/helper/src/types.ts). The helper checks `apiVersion === 1` and both required functions before use. The companion imports those types only and bundles independently. This is a same-host callback contract, not a cross-process transport. Public [extension exports](https://code.visualstudio.com/api/references/vscode-api#extensions) and [host placement](https://code.visualstudio.com/api/advanced-topics/extension-host) define that boundary.

| Operation | Contract |
| --- | --- |
| `registerBuild` | Owner + build ID is unique. Supply one local signal URI. Returns a disposable that stops its watcher and removes its targets. |
| `registerTarget` | Owner + instance ID is unique. Register its build first. Supply metadata, reload callback, visibility getter/event, and disposal event. Returns a disposable. |
| Reload callback | Regenerates HTML with the supplied opaque revision. May be async. Completion means the callback returned, not that the app is ready. |
| Conflicts | Direct API calls throw a useful error. The helper catches development integration errors so panels can still open. |

The consumer installs the parent-directory watcher before reconciling its baseline. An existing valid signal establishes the baseline without reloading. Missing directories and malformed signals show recoverable build status; a later valid success resumes the loop. Atomic replacement is detected. A one-second directory-identity check repairs watchers after their parent directory is moved or replaced on Windows. Signal data is read with a fixed size cap.

Duplicate revisions never request another reload. Every target runs at most one callback at a time and retains only its newest pending revision. Hidden targets wait for reveal without stealing focus. Paused targets retain pending work; resuming applies the newest revision. Manual reload creates a fresh token and can run while paused, but still waits while hidden. Closing a target discards queued work. A callback already running may finish, but cannot restore a disposed registration or change its replacement.

Build failure leaves the current UI running. A callback failure affects one target and leaves manual retry available. Logs contain owner, target, revision, receipt time, callback timing, and errors. They store build metadata, not application message payloads. Labels use plain Tree View text, and log records use JSON escaping. No readiness claim is made by the companion.
