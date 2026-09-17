![Live Webview: live reload for VS Code webviews. Edit your frontend, build successfully, and reload registered views.](https://raw.githubusercontent.com/JDeffner/live-webview/main/docs/branding/header.png)

Reload your extension's webviews after a successful frontend build, inside the real Extension Development Host. See JavaScript and CSS changes without restarting the host. Your extension keeps its panels, HTML, resource URLs, state, and message handlers.

**[Get started](https://github.com/JDeffner/live-webview/wiki/Getting-started)** · **[Integration guide](https://github.com/JDeffner/live-webview/wiki/Integration)** · **[Download the helper](https://github.com/JDeffner/live-webview/releases)**

## A shorter preview loop

- Reload registered panels and sidebar views when their frontend build succeeds. A failed build leaves the current UI usable.
- Reload one instance, pause automatic reload, or resume from **Explorer → Live Webview**. Hidden views catch up when revealed.
- Open **Live Webview: Open Logs** to inspect build and reload errors.

## Set up your extension

1. Install **Live Webview** (`JDeffner.live-webview`) in the profile used by your target's Extension Development Host.
2. Download the helper tarball from [GitHub Releases](https://github.com/JDeffner/live-webview/releases) and add it to your target: `pnpm add -D "path/to/webview-dev-helper-1.0.0.tgz"`.
3. [Connect the helper](https://github.com/JDeffner/live-webview/wiki/Integration) in your development build. Register each build and each panel or resolved sidebar view with a callback that regenerates its HTML.
4. Add a [successful-build signal](https://github.com/JDeffner/live-webview/wiki/Build-signals). An esbuild adapter is included. Start your watch task, launch the target with F5, and open its webview.
5. Edit the frontend. After the build succeeds, the affected visible views reload.

Run **Live Webview: Setup** for the complete offline guide. To try a working example first, use the [standalone fixture](https://github.com/JDeffner/live-webview/wiki/Getting-started).

## What to expect

The target extension must opt in. Installing the companion alone does not attach it to arbitrary webviews. Use local desktop VS Code 1.74 or newer and a trusted workspace. The helper runs only in an explicit development build in Development mode; it is distributed as a tarball, not on npm.

Reload starts the frontend again. Restore form values and selection through [your application's state contract](https://github.com/JDeffner/live-webview/wiki/State-and-reload). Host-side code changes still require a debug restart. Framework HMR, message inspection, remote hosts, and browser VS Code are outside this release.

## Help and source

[Troubleshooting](https://github.com/JDeffner/live-webview/wiki/Troubleshooting) · [API reference](https://github.com/JDeffner/live-webview/wiki/API-reference) · [Report an issue](https://github.com/JDeffner/live-webview/issues) · [Source code](https://github.com/JDeffner/live-webview)

Licensed under [MIT](https://github.com/JDeffner/live-webview/blob/main/LICENSE.txt).
