# Build signals

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
