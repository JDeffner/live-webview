# Develop Live Webview

## Checks and artifacts

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm integration-test
pnpm package
pnpm prepare-fixture
pnpm integration-test --packaged --independent
pnpm integration-test --packaged --independent --development
pnpm integration-test --packaged --independent --development --watch
pnpm integration-test --absent
pnpm integration-test --production --absent
pnpm integration-test --untrusted
```

Build once with `pnpm build` before the checks on a fresh checkout. Integration runs rebuild the selected fixture in the required mode. The default run uses Microsoft's `@vscode/test-electron` runner with two development extensions. Development-mode and trust tests use its downloaded executable directly because that runner always enables Test mode and disables workspace trust. All runs use isolated directories below `.vscode-test` and close their hosts. The fixture-only Development probe is removed from production bundles.

The package command creates `artifacts/live-webview-0.1.1.vsix` and `artifacts/webview-dev-helper-0.1.1.tgz`. The VSIX has no runtime package dependencies. Sample JSON files join fixture-ready acknowledgements with the companion's receipt logs. They report build time separately and do not enforce timing thresholds in CI.

Linux CI is checked in. Local validation results and any unverified criteria are recorded in [validation.md](validation.md).

v0.1 supports local desktop VS Code with a Node extension host. It does not support remote hosts, browser VS Code, arbitrary attachment, production-target overrides, or host hot swapping. Message inspection, sample scenarios, and Vite HMR remain later stages.
