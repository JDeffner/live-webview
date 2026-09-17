![Live Webview](docs/branding/header.png)

# Live Webview

Reload your extension's webviews after a successful frontend build, inside the real Extension Development Host. Live Webview supplies targeted reload and native controls. Your extension keeps its panels, HTML, resource URLs, state, and message handlers.

**[Usage wiki](https://github.com/JDeffner/live-webview/wiki)** · **[Downloads](https://github.com/JDeffner/live-webview/releases)**

## Quick start

1. Download the VSIX and helper tarball from [GitHub Releases](https://github.com/JDeffner/live-webview/releases). Install the VSIX with **Extensions: Install from VSIX...** in the profile used by your target's Development Host.
2. Add the matching helper to your target: `pnpm add -D "path/to/webview-dev-helper-0.1.1.tgz"`.
3. [Connect the helper](https://github.com/JDeffner/live-webview/wiki/Integration) in your development build. Register each build, then each panel or resolved sidebar view with a callback that regenerates its HTML.
4. [Add a successful-build signal](https://github.com/JDeffner/live-webview/wiki/Build-signals) to your frontend build. Start the watch task, launch the target with F5, and open its normal webview.
5. Save a frontend change. After the build succeeds, visible registered targets reload. Use **Explorer → Live Webview** to reload one instance, pause, or resume. **Live Webview: Open Logs** shows diagnostics.

The companion must run in the same host as the target. Installing it alone does not attach it to arbitrary webviews. Use local desktop VS Code 1.74 or newer and a trusted workspace. The helper is active only in an explicit development build running in Development mode.

## Try the example

Use Node 24 and pnpm 11.25.0. From a clone of this repository:

```sh
pnpm install --frozen-lockfile
pnpm build
```

Open the repository in VS Code, select **Fixture + companion** in Run and Debug, and press F5. In the new host, trust the fixture workspace and run **Webview Fixture: Open Panels**. Edit `examples/esbuild/src/frontend.ts` or `frontend.css` in the source window. A successful build changes the frontend boot token and completes a host round trip. Expand **Webview Fixture** in Explorer to try the sidebar.

Stop debugging and terminate the **fixture watch** task when finished. See [Getting started](https://github.com/JDeffner/live-webview/wiki/Getting-started) for the installed-companion and independent-helper routes.

## Learn more

- [Controls and status](https://github.com/JDeffner/live-webview/wiki/Controls)
- [State restoration](https://github.com/JDeffner/live-webview/wiki/State-and-reload), an opt-in application contract; arbitrary frontend state is not preserved.
- [Troubleshooting](https://github.com/JDeffner/live-webview/wiki/Troubleshooting)
- [API reference](https://github.com/JDeffner/live-webview/wiki/API-reference)
- [Development checks](docs/development.md) and [validation evidence](docs/validation.md)
- [Marketplace release workflow](docs/releases.md), including the one-time publishing token setup and automatic stable/prerelease uploads.

Host code changes still require a rebuild and debug restart. Remote hosts, browser VS Code, message inspection, scenarios, and framework HMR are outside v0.1. The extension ID is `JDeffner.live-webview`. GitHub Releases provides the VSIX and matching helper tarball; the helper is not on npm.

## License

Source code and original artwork use the [MIT license](LICENSE.txt). The bundled Rubik font uses its own [SIL Open Font License](docs/branding/OFL.txt).
