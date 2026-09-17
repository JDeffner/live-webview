# Integrate your extension

## Add the helper to a target

Install the local tarball as a development dependency. Keep the target's existing tasks and F5 setup.

```sh
pnpm add -D /absolute/path/to/webview-dev-helper-1.0.0.tgz
```

Use the helper that matches your companion. Version 1.0.0 defaults to `JDeffner.live-webview`; the original v0.1.0 preview used `local.live-webview`. To connect a newer helper to the old VSIX deliberately, pass `{ enabled: true, companionId: 'local.live-webview' }` to `connectDevtools`.

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

Set the panel's initial HTML and install its normal message handlers before registering it. Registration does not render the first page. For example, a sidebar provider can use the same build and renderer:

```ts
import { randomUUID } from 'node:crypto';

context.subscriptions.push(vscode.window.registerWebviewViewProvider(
  'myExtension.sidebar',
  {
    resolveWebviewView(view) {
      // Set webview options, resource roots, and normal message handlers here.
      view.webview.html = renderHtml(view.webview, 'initial');
      dev?.registerView(view, {
        instanceId: randomUUID(),
        viewType: 'myExtension.sidebar',
        label: 'Editor sidebar',
        buildId: 'editor-ui',
        reload: revision => {
          view.webview.html = renderHtml(view.webview, revision);
        },
      });
    },
  },
));
```

Put this provider registration inside `activate`, where `context` is available. The example assumes your manifest already contributes `myExtension.sidebar` as a webview view. Keep your application's existing provider and add the registration there. See the complete [fixture host](https://github.com/JDeffner/live-webview/blob/main/examples/esbuild/src/extension.ts) for the renderer, strict CSP, and message handlers.

For an esbuild host bundle, set the flag with `define: { __WEBVIEW_DEV__: String(!production) }`, where `production` comes from your existing build mode. Bundle the dynamic import and remove the false branch in production. A type-only import creates no runtime dependency. The frontend signal plugin must also be omitted in production. Verify your packaged target still opens when Live Webview is absent.

The root must be explicitly supplied. Use `context.extensionUri` only when the signal is inside that project; otherwise supply the intended local project-root URI. Signal paths are relative and cannot escape that root. Add `.webview-dev/` to the target's ignore files.

No `extensionDependencies` entry is required. With `enabled: false`, Production mode, an untrusted workspace, or a remote host, the helper does not activate the companion or register anything. The normal entry also rejects Test mode; test fixtures can explicitly import `connectDevtoolsForTest` from `@webview-dev/helper/testing`. Missing, incompatible, or failed companion activation reports one development message and returns an inert integration. Target application errors remain the target's responsibility.
