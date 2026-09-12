# Live Webview helper

Opt-in host integration for extension-owned webviews. Requires a trusted, local Extension Development Host and `enabled: true`. The default entry accepts Development mode only. `@webview-dev/helper/testing` has a separate Test-mode entry.

Import `connectDevtools` inside a compile-time development branch. Register each build once, then call `registerPanel` or `registerView` for each live instance. The companion ID defaults to `local.live-webview` and can be overridden for a renamed local package.

`@webview-dev/helper/esbuild` contains `webviewDevSignal` and `createSignalPublisher`. Put the plugin last and await all earlier output-producing hooks. The publisher also supports build systems other than esbuild.

The extension is named Live Webview. Its publisher and this helper package scope remain provisional. This local package is not published. See the repository README for the full v1 contract and setup recipe.
