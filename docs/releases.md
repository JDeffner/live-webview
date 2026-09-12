# Publish a Marketplace release

The [Marketplace workflow](../.github/workflows/marketplace.yml) runs when a GitHub release is **published**. Drafts and ordinary commits do not publish an extension. It checks out the release tag, validates the version, builds and tests the project, packages the selected channel, tests the installed VSIX with the independent helper, then uploads that same VSIX to the Marketplace.

## One-time setup

Add a repository Actions secret named **VSCE_PAT** at [Settings → Secrets and variables → Actions](https://github.com/JDeffner/live-webview/settings/secrets/actions). Use an Azure DevOps PAT whose account can publish under `JDeffner`, with Marketplace **Manage** scope and **All accessible organizations** selected. Do not put it in source or a workflow file.

The extension publisher and helper default ID are now `JDeffner` and `JDeffner.live-webview`. The old GitHub v0.1.0 download uses `local.live-webview`; use its matching old helper, or pass `companionId: 'local.live-webview'` explicitly when testing that old VSIX with a newer helper. New source packages use the Marketplace identity. No Marketplace upload has been performed as part of preparing this workflow.

Microsoft has announced that global Azure DevOps PATs retire on **1 December 2026**. This workflow uses the requested PAT method; migrate its authentication to Microsoft Entra ID before that date. See [Microsoft's publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## Make a release

1. Set `packages/extension/package.json` to the version you will release. Use numeric `MAJOR.MINOR.PATCH`. Update the root version to match; update the helper version when its contents change. The current source is prepared as `0.1.1`, without creating a release.
2. Commit the changes and make a matching GitHub release tag, such as `v0.1.1`, from a commit containing this workflow. The workflow rejects a mismatch between the tag and extension manifest.
3. Select **Set as a pre-release** for a Marketplace prerelease. Leave it unchecked for a stable version. Publish the GitHub release.
4. Check **Actions → Publish to VS Code Marketplace**. The job preserves the tested VSIX and helper tarball as a workflow artifact before attempting upload. Download that artifact and attach the matching helper tarball to the GitHub release so target developers can install it. You can attach the VSIX there too.

| GitHub release | Marketplace result |
| --- | --- |
| `v0.1.1`, prerelease checked | Version `0.1.1`, prerelease channel |
| `v0.1.2`, prerelease unchecked | Version `0.1.2`, stable channel |
| `v0.1.1-beta.1` | Rejected: Marketplace versions do not accept suffixes |
| Draft release or tag push without a published release | No Marketplace job |

Use a new numeric version for each upload, including a switch from prerelease to stable. Editing an existing release's checkbox does not republish or convert its Marketplace version. Prerelease users can receive a higher stable version, so plan version ordering for both channels. These constraints come from [VS Code's prerelease rules](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#pre-release-extensions). The workflow uses [`release: published`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#release) because it covers both stable releases and prereleases, including publication from drafts.

## Missing credentials or a failed upload

Without `VSCE_PAT`, validation, tests, and packaging still run. The upload step then fails with a message explaining which secret to add; it makes no Marketplace request. Add the secret and use **Re-run failed jobs** for that run. Invalid or expired credentials fail at the upload step.

Adding a secret does not retroactively trigger old releases. The existing v0.1.0 tag predates this workflow. Publish a new release from the updated source to trigger it. Releases created by another workflow with its default `GITHUB_TOKEN` may not trigger a second workflow; create the release through GitHub's UI, your authenticated CLI, or an appropriately configured GitHub App.

If the Marketplace already accepted the version, inspect it before retrying. The workflow does not ignore duplicate-version errors or delete published versions. It publishes only the VS Code extension; it does not publish the helper to npm or replace GitHub release attachments.

## Check locally without uploading

```sh
pnpm package --pre-release
pnpm prepare-fixture
pnpm integration-test --packaged --independent
```

Use `pnpm package` without the flag to build a stable VSIX. Output names follow the extension and helper manifest versions. Packaging never publishes, and no PAT is needed for these commands. The `VSCE_PAT` secret is supplied only to the final Marketplace upload step.
