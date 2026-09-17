# Getting started

Start with the fixture if you want to see a reload before changing your own extension. To integrate an existing project, install the preview, then follow [Integration](https://github.com/JDeffner/live-webview/wiki/Integration) and [Build signals](https://github.com/JDeffner/live-webview/wiki/Build-signals).

## Install the preview release

Download `live-webview-0.1.1.vsix` and `webview-dev-helper-0.1.1.tgz` from the release. In your target development profile, run **Extensions: Install from VSIX...** and select the VSIX. Follow [Add the helper to a target](https://github.com/JDeffner/live-webview/wiki/Integration) to connect your webview and frontend build. The standalone fixture below demonstrates the full setup in an isolated host.

## Run the fixture

Use Node 24 and pnpm 11.25.0. From the repository root:

```sh
git clone https://github.com/JDeffner/live-webview.git
cd live-webview
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
code --user-data-dir .vscode-test/manual-profile --extensions-dir .vscode-test/manual-extensions --install-extension artifacts/live-webview-0.1.1.vsix --force
```

Select **Fixture + installed companion**, then press F5 and open the fixture panels. This launch loads only the target as a development extension. The companion comes from the isolated extensions directory used above. Installing it only in the parent source window is insufficient; it must be available in the target's host.

These commands use the current source version, `0.1.1`. The original GitHub v0.1.0 downloads use the placeholder ID `local.live-webview`. Current source uses `JDeffner.live-webview`. Uninstall or disable the old `local` companion in that profile before using the new one, so both copies do not contribute the same commands. Keep the companion and helper from the same release or build; see [Integration](https://github.com/JDeffner/live-webview/wiki/Integration) when mixing versions deliberately.

To exercise the helper tarball without workspace links:

```sh
pnpm prepare-fixture
pnpm integration-test --packaged --independent
```

`artifacts/fixture` is a separate copy with its own pnpm workspace and a `file:` dependency on the helper tarball. The preparation script checks its resolved helper path. It installs no package from the source workspace. To use that copy by hand, open `artifacts/fixture`, install the VSIX into its `.dev-profile` and `.dev-extensions` with the same CLI flags, then use its F5 configuration. Use the absolute VSIX path when running the install command from that folder.

## Choose the host for your own project

Keep your target's launch configuration. For an isolated installation, add these arguments to its existing `extensionHost` configuration:

```json
"--user-data-dir=${workspaceFolder}/.dev-profile",
"--extensions-dir=${workspaceFolder}/.dev-extensions"
```

From that target's project root, install the downloaded VSIX into those same directories before launching:

```sh
code --user-data-dir .dev-profile --extensions-dir .dev-extensions --install-extension "absolute/path/to/live-webview-0.1.1.vsix"
```

Replace the quoted path with your actual download path. Add `.dev-profile/`, `.dev-extensions/`, and `.webview-dev/` to the target's ignore files. Launch with F5, open the target's normal webview, and look for its registration in **Explorer → Live Webview** in the new host.
