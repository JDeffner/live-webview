# Troubleshooting

Start with **Live Webview: Open Logs** in the target's Development Host. Target tooltips show the instance ID, build ID, and current error. Helper connection errors go to the target's debug console by default, or to the `report` callback you supplied.

## The view is empty

Check these in order:

1. Open your target's panel or resolve its sidebar view. Live Webview only lists instances that the owner has registered.
2. Confirm that the matching companion is installed and enabled in the **target host**: `JDeffner.live-webview` for current source, or `local.live-webview` for the original v0.1.0 download. Installing it only in the parent source window is not enough if the launch uses a different extensions directory or profile.
3. Build the target with its development flag enabled and launch it with F5. A normal production installation is deliberately inert.
4. Use a trusted local workspace. After granting trust to a session that connected while untrusted, restart debugging so the target calls the helper again.
5. Register the build before its targets. Match each target's `buildId` and use a unique `instanceId` for each live instance.

An absent or incompatible companion leaves the target working and reports one development message. It does not install itself. See [Integration](https://github.com/JDeffner/live-webview/wiki/Integration) for the connection code.

## Saving has no visible effect

Check that your watch task is running and publishes a **success** signal after all output is written. Live Webview does not reload from a source save alone. The helper and build tool must use the same project root, relative signal path, and build ID.

An existing signal is read as a baseline when the build is registered. Make another successful build to trigger automatic reload. Reusing a revision token has no effect. A paused target waits for resume; a hidden target waits for reveal.

If the callback completes but assets stay stale, include its revision in each asset URL and regenerate the HTML with a new nonce. Use the current `asWebviewUri` result and keep the resource inside `localResourceRoots`. CSP or script errors appear in VS Code's **Developer: Open Webview Developer Tools** console.

Changes to host TypeScript or a renderer bundled into the host need a rebuild and debug restart. Full frontend reload does not replace host modules.

## Build failed

A failed build leaves the current frontend running. Fix the build error and let the next successful build publish a new revision. You do not need to restart the watcher.

For a signal error, check that the file is UTF-8 JSON, at most 8192 bytes, with schema version 1, the expected build ID, a nonempty unique revision, and `success` or `error` status. A missing directory, malformed file, or temporary absence is recoverable. The build producer should create the directory and replace the signal atomically. See [Build signals](https://github.com/JDeffner/live-webview/wiki/Build-signals).

## Reload failed

Read the target's error and fix its renderer or callback. Then use **Live Webview: Reload Target** to retry. Manual reload uses the files already on disk; run a build first if those files need changing. One target's callback failure does not stop other targets.

## A form resets after reload

State preservation belongs to the target application. Store the values you need and restore them during the new frontend's ready/state handshake. The fixture demonstrates value and selection restoration. It does not preserve arbitrary DOM or JavaScript state. See [State and reload](https://github.com/JDeffner/live-webview/wiki/State-and-reload).

## Reporting a problem

Include your VS Code version, operating system, launch mode, helper/companion versions, affected build and instance IDs, and the relevant build/reload log records in a [GitHub issue](https://github.com/JDeffner/live-webview/issues). State whether the supplied fixture reproduces it. Logs record build metadata and callback timing, not application message payloads; review paths and error text before sharing them.
