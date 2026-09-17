# Publish a Marketplace release

The [Marketplace workflow](../.github/workflows/marketplace.yml) publishes automatically when you publish a GitHub release. A prerelease goes to the Marketplace prerelease channel; a stable release goes to the stable channel. Drafts and ordinary commits do not upload an extension.

The job checks out the release tag, validates the version, builds and tests the project, packages the selected channel, tests the installed VSIX with the independent helper, then uploads that same VSIX.

## One-time setup

The workflow uses one secret, `VSCE_PAT`. This route does not need an Entra app registration, a new Microsoft account, or an Azure DevOps directory connection. Use the existing Microsoft account that has publishing access to **JDeffner**.

1. Open [Azure DevOps personal access tokens](https://dev.azure.com/jdevner/_usersSettings/tokens) with that account and select **New Token**.
2. Set the name to `Live Webview GitHub publishing`. Choose **All accessible organizations**. Under **Custom defined**, select **Show all scopes**, then **Marketplace: Manage**. Do not select Full access.
3. Choose an expiration date and create the token. Store it in your password manager, not in source or chat.
4. Open the repository's [environments](https://github.com/JDeffner/live-webview/settings/environments), select **marketplace**, and add an **environment secret** named `VSCE_PAT` with that token as its value. It must be a secret, not a variable.
5. Once this workflow is on `main`, open **Actions > Publish to VS Code Marketplace > Run workflow** and select `main`. This checks publisher access without uploading anything.

The environment permits tags matching `v*` and the `main` branch. Keep those restrictions: releases run from tags, while the manual credential check runs only on `main`. Authentication and Marketplace publication were verified on 17 September 2026 for the [0.1.2 prerelease](https://github.com/JDeffner/live-webview/actions/runs/35184807354).

Microsoft's [publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token) documents the token scope and organization selection. If policy prevents creating the token, retain the exact error; changing the workflow cannot override an account policy.

## Token lifetime and future authentication

This is an interim authentication route. Microsoft currently states that global Azure DevOps PATs retire on **1 December 2026**. An earlier token expiration also stops publishing until the secret is replaced. Set a reminder before the selected expiration date. See the [retirement notice](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publishing-extensions).

As checked on 17 September 2026, Microsoft's current `vsce` source and README implement direct GitHub trusted publishing through `--oidc`. However, the option was [hidden as unannounced](https://github.com/microsoft/vscode-vsce/pull/1297), and availability of Marketplace policy configuration for this publisher has not been verified. Do not treat a CLI flag alone as a working publishing setup. Once the publisher can configure a trusted policy, upgrade the pinned tool, configure repository/workflow trust, and verify the exchange before switching. See [vsce trusted publishing](https://github.com/microsoft/vscode-vsce#trusted-publishing).

The earlier Entra workflow has been replaced by this simpler token flow. `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and the federated credential are not used by this workflow. This source change does not delete any Azure accounts, registrations, credentials, or GitHub variables.

## Make a release

1. Set `packages/extension/package.json` to the version you will release. Use numeric `MAJOR.MINOR.PATCH`. Update the root version to match; update the helper version when releasing a new helper. The first stable release aligns both packages at `1.0.0` and retains API v1.
2. Commit the changes and make a matching GitHub release tag, such as `v1.0.0`, from a commit containing this workflow. The workflow rejects a mismatch between the tag and extension manifest.
3. Select **Set as a pre-release** for a Marketplace prerelease. Leave it unchecked for a stable version. Publish the GitHub release.
4. Check **Actions > Publish to VS Code Marketplace**. The job preserves the tested VSIX and helper tarball as a workflow artifact before attempting upload. Download that artifact and attach the matching helper tarball to the GitHub release so target developers can install it. You can attach the VSIX there too.

| GitHub release | Marketplace result |
| --- | --- |
| `v1.1.0`, prerelease checked | Version `1.1.0`, prerelease channel |
| `v1.0.0`, prerelease unchecked | Version `1.0.0`, stable channel |
| `v1.0.0-beta.1` | Rejected: Marketplace versions do not accept suffixes |
| Draft release or tag push without a published release | No Marketplace job |
| Manual workflow run on `main` | Publisher-access verification only, no upload |

Use a new numeric version for each upload, including a switch from prerelease to stable. Editing an existing release's checkbox does not republish or convert its Marketplace version. Prerelease users can receive a higher stable version, so plan version ordering for both channels. See [VS Code's prerelease rules](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#pre-release-extensions). The workflow uses [`release: published`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#release) because it covers both stable releases and prereleases, including publication from drafts.

The publisher and helper default ID are `JDeffner` and `JDeffner.live-webview`. The old GitHub v0.1.0 download uses `local.live-webview`; use its matching old helper, or pass `companionId: 'local.live-webview'` explicitly when testing that old VSIX with a newer helper. New source packages use the Marketplace identity.

## Authentication failures

A missing `VSCE_PAT` stops the job with a setup error. An expired token, incorrect scope, or account without publisher access fails authentication. Replace the environment secret as needed, then run the manual check again. The token is exposed only to the publish or verification step, not to dependency installation, build, or tests.

Adding a secret does not retroactively trigger old releases. The existing v0.1.0 tag predates this workflow. Publish a new release from the updated source to trigger upload. Releases created by another workflow with its default `GITHUB_TOKEN` may not trigger a second workflow; create the release through GitHub's UI, your authenticated CLI, or an appropriately configured GitHub App.

If the Marketplace already accepted the version, inspect it before retrying. The workflow does not ignore duplicate-version errors or delete published versions. It publishes only the VS Code extension; it does not publish the helper to npm or replace GitHub release attachments.

## Check locally without uploading

```sh
pnpm package --pre-release
pnpm prepare-fixture
pnpm integration-test --packaged --independent
```

Use `pnpm package` without the flag to build a stable VSIX. Output names follow the extension and helper manifest versions. Packaging never publishes and needs no token or Azure login.
