![Live Webview](docs/branding/header.png)

# Live Webview

Reload registered webviews after a successful frontend build, inside the real Extension Development Host. The target extension owns its panels, HTML, state, resource URIs, and message handlers. The companion schedules reload callbacks and supplies native controls.

Live Webview is an early desktop VS Code extension, released under the [MIT license](LICENSE.txt). It uses a companion extension and a small helper that the target extension opts into. The companion runs in the same Extension Development Host as the target.

Download the VSIX and helper tarball from [GitHub Releases](https://github.com/JDeffner/live-webview/releases). The extension is not on the VS Code Marketplace, and the helper is not published on npm. The local extension ID is `local.live-webview`; the publisher and `@webview-dev/helper` scope remain provisional.

## Install the preview release

Download `live-webview-0.1.0.vsix` and `webview-dev-helper-0.1.0.tgz` from the release. In your target development profile, run **Extensions: Install from VSIX...** and select the VSIX. Follow [Add the helper to a target](#add-the-helper-to-a-target) to connect your webview and frontend build. The standalone fixture below demonstrates the full setup in an isolated host.

## Run the fixture

Use Node 24 and pnpm 11.25.0. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
```

Open this folder in desktop VS Code. Select **Fixture + companion** in Run and Debug, then press F5. The launch task builds both extensions and starts the frontend watcher. In the new Extension Development Host, trust this local fixture workspace and run **Webview Fixture: Open Panels**. Expand **Webview Fixture** in Explorer to show the sidebar fixture.

Edit `examples/esbuild/src/frontend.ts` or `frontend.css` in the source window. A successful frontend build reloads the two panels and the visible sidebar. Type in a fixture input before saving to see its value and selection restored. The boot token changes after reload and appears beside the completed host round trip.

The **Live Webview** Explorer view groups live targets by owner. Use its inline or context actions to reload one instance, pause automatic reload, or resume. The same commands are available from the Command Palette with a target picker. **Live Webview: Open Logs** opens build and callback diagnostics.

F5 starts the VS Code version that opened the source workspace. Automated checks download and run the pinned minimum version, **1.74.0**. The minimum follows the implicit activation of contributed commands and views introduced in [VS Code 1.74](https://code.visualstudio.com/updates/v1_74#_implicit-activation-events-for-declared-extension-contributions). The declarations are pinned to that version too.

Stop the debug session, then terminate the **fixture watch** task when finished. The companion does not own build processes.

## Test the installed companion

```sh
pnpm package
code --user-data-dir .vscode-test/manual-profile --extensions-dir .vscode-test/manual-extensions --install-extension artifacts/live-webview-0.1.0.vsix --force
```

Select **Fixture + installed companion**, then press F5 and open the fixture panels. This launch loads only the target as a development extension. The companion comes from the isolated extensions directory used above. Installing it only in the parent source window is insufficient; it must be available in the target's host.

To exercise the helper tarball without workspace links:

```sh
pnpm prepare-fixture
pnpm integration-test --packaged --independent
```

`artifacts/fixture` is a separate copy with its own pnpm workspace and a `file:` dependency on the helper tarball. The preparation script checks its resolved helper path. It installs no package from the source workspace. To use that copy by hand, open `artifacts/fixture`, install the VSIX into its `.dev-profile` and `.dev-extensions` with the same CLI flags, then use its F5 configuration. Use the absolute VSIX path when running the install command from that folder.

## Add the helper to a target

Install the local tarball as a development dependency. Keep the target's existing tasks and F5 setup.

```sh
pnpm add -D /absolute/path/to/webview-dev-helper-0.1.0.tgz
```

Bundle this host code with `__WEBVIEW_DEV__` defined as `true` only in your explicit development build and as `false` in production:

```ts
import * as vscode from 'vscode';
import type { Integration } from '@webview-dev/helper';
declare const __WEBVIEW_DEV__: boolean;

let dev: Integration | undefined;
export async function activate(context: vscode.ExtensionContext) {
  if (__WEBVIEW_DEV__) {
    const { connectDevtools } = await import('@webview-dev/helper');
    dev = await connectDevtools(context, { enabled: true });
    dev.registerBuild('editor-ui', context.extensionUri, '.webview-dev/editor-ui.json');
  }
  // Continue normal command/provider setup. A missing companion is harmless.
}

function registerPanel(panel: vscode.WebviewPanel, instanceId: string) {
  dev?.registerPanel(panel, {
    instanceId, viewType: 'myExtension.editor', label: 'Editor', buildId: 'editor-ui',
    reload: revision => { panel.webview.html = renderHtml(panel.webview, revision); },
  });
}
```

`renderHtml` is your existing renderer. Add the revision as a query parameter to fresh `asWebviewUri` asset URLs, generate a nonce each time, and HTML-escape attribute values. Keep your resource roots and CSP. The fixture shows a strict `default-src 'none'` policy with external CSS and a nonce-authorized script.

Call `registerPanel` when each panel is created. Use a unique instance ID for every live panel. For a resolved sidebar view, call `dev.registerView(view, options)` inside `resolveWebviewView`. The helper adapts disposal and visibility events. Register each build once, before its targets, and dispose the integration when its owning development setup stops. It also joins `context.subscriptions`.

The root must be explicitly supplied. Use `context.extensionUri` only when the signal is inside that project; otherwise supply the intended local project-root URI. Signal paths are relative and cannot escape that root. Add `.webview-dev/` to the target's ignore files.

No `extensionDependencies` entry is required. With `enabled: false`, Production mode, an untrusted workspace, or a remote host, the helper does not activate the companion or register anything. The normal entry also rejects Test mode; test fixtures can explicitly import `connectDevtoolsForTest` from `@webview-dev/helper/testing`. Missing, incompatible, or failed companion activation reports one development message and returns an inert integration. Target application errors remain the target's responsibility.

## Signal successful builds

Add this plugin **last** in the frontend esbuild plugin list:

```ts
import { webviewDevSignal } from '@webview-dev/helper/esbuild';

plugins: [
  // Other plugins go here. Async output-producing onEnd hooks must return promises.
  webviewDevSignal({
    projectRoot: absoluteProjectRoot,
    signalPath: '.webview-dev/editor-ui.json',
    buildId: 'editor-ui',
  }),
]
```

esbuild runs `onEnd` callbacks serially and awaits their promises. The adapter must be last so it sees earlier errors and waits for their outputs. A plugin that starts unawaited background work cannot establish build completion. `write: false` is rejected; publish explicitly after writing all `outputFiles` instead. See the [esbuild plugin contract](https://esbuild.github.io/plugins/#on-end).

For another build system, create one publisher per build group:

```ts
import { createSignalPublisher } from '@webview-dev/helper/esbuild';
const publish = createSignalPublisher({ projectRoot, signalPath, buildId: 'editor-ui' });
try {
  await buildAllOutputs();
  await publish({ status: 'success' });
} catch (error) {
  await publish({ status: 'error', message: String(error) });
}
```

The publisher serializes publication and creates a unique revision for every call. A non-JavaScript producer can write this UTF-8 JSON format to a temporary file in the signal directory, then atomically replace the signal file after every output is complete:

```json
{"schemaVersion":1,"buildId":"editor-ui","revision":"opaque-unique-token","status":"success"}
```

For failure, use `"status":"error"` and a short `"message"`. Keep the complete signal at most 8192 bytes, the revision at most 200 characters, and an error message at most 2000 characters. Use a new opaque token for each attempt. Do not use rounded timestamps. Use one producer per build group; publication order is the revision order. Never emit success from a source-file save or before a post-build asset copy finishes.

## v1 API behavior

The companion's `activate()` exports `DevtoolsApiV1`, defined in `packages/helper/src/types.ts`. The helper checks `apiVersion === 1` and both required functions before use. The companion imports those types only and bundles independently. This is a same-host callback contract, not a cross-process transport. Public [extension exports](https://code.visualstudio.com/api/references/vscode-api#extensions) and [host placement](https://code.visualstudio.com/api/advanced-topics/extension-host) define that boundary.

| Operation | Contract |
| --- | --- |
| `registerBuild` | Owner + build ID is unique. Supply one local signal URI. Returns a disposable that stops its watcher and removes its targets. |
| `registerTarget` | Owner + instance ID is unique. Register its build first. Supply metadata, reload callback, visibility getter/event, and disposal event. Returns a disposable. |
| Reload callback | Regenerates HTML with the supplied opaque revision. May be async. Completion means the callback returned, not that the app is ready. |
| Conflicts | Direct API calls throw a useful error. The helper catches development integration errors so panels can still open. |

The consumer installs the parent-directory watcher before reconciling its baseline. An existing valid signal establishes the baseline without reloading. Missing directories and malformed signals show recoverable build status; a later valid success resumes the loop. Atomic replacement is detected. A one-second directory-identity check repairs watchers after their parent directory is moved or replaced on Windows. Signal data is read with a fixed size cap.

Duplicate revisions never request another reload. Every target runs at most one callback at a time and retains only its newest pending revision. Hidden targets wait for reveal without stealing focus. Paused targets retain pending work; resuming applies the newest revision. Manual reload creates a fresh token and can run while paused, but still waits while hidden. Closing a target discards queued work. A callback already running may finish, but cannot restore a disposed registration or change its replacement.

Build failure leaves the current UI running. A callback failure affects one target and leaves manual retry available. Logs contain owner, target, revision, receipt time, callback timing, and errors. They store build metadata, not application message payloads. Labels use plain Tree View text, and log records use JSON escaping. No readiness claim is made by the companion.

## State and host code

Full reload restarts frontend JavaScript. In this fixture, input events update host-owned value and selection. Each new frontend requests state, applies the response, then acknowledges its boot token. The automated test dispatches a real DOM input event through a fixture-only message, then checks the value and selection after reload. This state contract is opt-in application behavior. Arbitrary DOM and JavaScript state is not preserved. See the [webview persistence guide](https://code.visualstudio.com/api/extension-guides/webview#persistence).

Host TypeScript, including a bundled HTML generator, still needs a host rebuild and debug restart. A renderer can read an explicitly external template on each callback if it needs template-only reload. The companion neither swaps host modules nor rewrites arbitrary HTML.

## Checks and artifacts

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm integration-test
pnpm package
pnpm prepare-fixture
pnpm integration-test --packaged --independent
pnpm integration-test --packaged --independent --development
pnpm integration-test --packaged --independent --development --watch
pnpm integration-test --absent
pnpm integration-test --production --absent
pnpm integration-test --untrusted
```

Build once with `pnpm build` before the checks on a fresh checkout. Integration runs rebuild the selected fixture in the required mode. The default run uses Microsoft's `@vscode/test-electron` runner with two development extensions. Development-mode and trust tests use its downloaded executable directly because that runner always enables Test mode and disables workspace trust. All runs use isolated directories below `.vscode-test` and close their hosts. The fixture-only Development probe is removed from production bundles.

The package command creates `artifacts/live-webview-0.1.0.vsix` and `artifacts/webview-dev-helper-0.1.0.tgz`. The VSIX has no runtime package dependencies. Sample JSON files join fixture-ready acknowledgements with the companion's receipt logs. They report build time separately and do not enforce timing thresholds in CI.

Linux CI is checked in. Local validation results and any unverified criteria are recorded in `docs/validation.md`.

v0.1 supports local desktop VS Code with a Node extension host. It does not support remote hosts, browser VS Code, arbitrary attachment, production-target overrides, or host hot swapping. Message inspection, sample scenarios, and Vite HMR remain later stages.

## Brand and license

The [brand assets](docs/branding/README.md) include the approved vector mark and generated header. Source code and original artwork use the [MIT license](LICENSE.txt). The bundled Rubik font uses its own [SIL Open Font License](docs/branding/OFL.txt).
