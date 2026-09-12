# State and reload

## State and host code

Full reload restarts frontend JavaScript. In this fixture, input events update host-owned value and selection. Each new frontend requests state, applies the response, then acknowledges its boot token. The automated test dispatches a real DOM input event through a fixture-only message, then checks the value and selection after reload. This state contract is opt-in application behavior. Arbitrary DOM and JavaScript state is not preserved. See the [webview persistence guide](https://code.visualstudio.com/api/extension-guides/webview#persistence).

Host TypeScript, including a bundled HTML generator, still needs a host rebuild and debug restart. A renderer can read an explicitly external template on each callback if it needs template-only reload. The companion neither swaps host modules nor rewrites arbitrary HTML.
