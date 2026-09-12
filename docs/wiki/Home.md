# Live Webview usage guide

Live Webview reloads your extension's webviews after a successful frontend build. You keep the real Extension Development Host, the target's message handlers, and its normal commands.

It is a developer tool for webviews that you own. Install the companion, connect the helper in your target extension, and send a successful-build signal. Installing the companion alone does not attach it to existing webviews.

## Start here

| Task | Guide |
| --- | --- |
| Try a working example or install the preview | [Getting started](https://github.com/JDeffner/live-webview/wiki/Getting-started) |
| Connect panels and sidebar views in your extension | [Integration](https://github.com/JDeffner/live-webview/wiki/Integration) |
| Set up esbuild or another build tool | [Build signals](https://github.com/JDeffner/live-webview/wiki/Build-signals) |
| Reload, pause, resume, and read status | [Controls](https://github.com/JDeffner/live-webview/wiki/Controls) |
| Keep application state across reloads | [State and reload](https://github.com/JDeffner/live-webview/wiki/State-and-reload) |
| Diagnose missing targets or failed reloads | [Troubleshooting](https://github.com/JDeffner/live-webview/wiki/Troubleshooting) |
| Check registration and scheduling behavior | [API reference](https://github.com/JDeffner/live-webview/wiki/API-reference) |

## Requirements

Use local desktop VS Code 1.74 or newer, a Node extension host, and a trusted workspace. The target must run in Development mode with the helper explicitly enabled. The companion must be available in that same host.

The v0.1.0 preview is available from [GitHub Releases](https://github.com/JDeffner/live-webview/releases/tag/v0.1.0). It is not on the Marketplace, and the helper is not on npm. Remote hosts, browser VS Code, framework HMR, message inspection, and automatic attachment to arbitrary extensions are outside this version.

[Source repository](https://github.com/JDeffner/live-webview) · [Development checks](https://github.com/JDeffner/live-webview/blob/main/docs/development.md) · [Validation evidence](https://github.com/JDeffner/live-webview/blob/main/docs/validation.md) · [Report an issue](https://github.com/JDeffner/live-webview/issues)
