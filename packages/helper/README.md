# Live Webview helper

Opt-in host integration for extension-owned webviews. Requires a trusted, local Extension Development Host and `enabled: true`. The default entry accepts Development mode only. `@webview-dev/helper/testing` has a separate Test-mode entry.

Import `connectDevtools` inside a compile-time development branch. Register each build once, then call `registerPanel` or `registerView` for each live instance. The companion ID defaults to `JDeffner.live-webview`. Pass `companionId: 'local.live-webview'` only when connecting to the original v0.1.0 preview VSIX.

`@webview-dev/helper/esbuild` contains `webviewDevSignal` and `createSignalPublisher`. Put the plugin last and await all earlier output-producing hooks. The publisher also supports build systems other than esbuild.

The extension is named Live Webview and uses the `JDeffner` publisher. This helper is distributed as a tarball, not through npm. See the [usage wiki](https://github.com/JDeffner/live-webview/wiki/Integration) for the registration recipe and v1 contract.
