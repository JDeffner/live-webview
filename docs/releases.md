# Publish a Marketplace release

The [Marketplace workflow](../.github/workflows/marketplace.yml) runs when a GitHub release is **published**. Drafts and ordinary commits do not publish an extension. It checks out the release tag, validates the version, builds and tests the project, packages the selected channel, tests the installed VSIX with the independent helper, then uploads that same VSIX to the Marketplace.

## One-time setup

Publishing uses a Microsoft Entra app registration and GitHub OpenID Connect. It does not use a PAT or client secret. The GitHub job signs in through `azure/login` and `vsce` uses that Azure CLI identity. The app-registration route uses tenant-level login with `allow-no-subscriptions: true`; no Azure subscription ID or Azure resource role is needed for this workflow. See [Azure Login's tenant-only option](https://github.com/Azure/login#login-without-subscription).

### Register the application

In Microsoft Entra, open **App registrations → New registration**:

| Field | Value |
| --- | --- |
| Name | `Live-Webview` |
| Supported account types | Single tenant, this directory only |
| Redirect URI | Leave empty |

Register the app. Its Overview page supplies the **Application (client) ID** and **Directory (tenant) ID**. These are identifiers, not secrets. Set them as `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` environment variables in GitHub's [marketplace environment](https://github.com/JDeffner/live-webview/settings/environments). Do not create a client secret or add interactive sign-in permissions for this job.

### Trust the GitHub environment

Open the app's **Certificates & secrets → Federated credentials → Add credential**. Select **Other issuer** and enter:

| Field | Exact value |
| --- | --- |
| Issuer | `https://token.actions.githubusercontent.com` |
| Subject identifier | `repo:JDeffner@134447802/live-webview@1367030344:environment:marketplace` |
| Audience | `api://AzureADTokenExchange` |
| Name | `github-live-webview-marketplace` |

The same values are available in [azure-federated-credential.json](azure-federated-credential.json). This repository has immutable OIDC subjects enabled, verified through GitHub's repository API. The owner ID and repository ID are part of its subject. Do not substitute the older `repo:JDeffner/live-webview:environment:marketplace` example. See [Microsoft's immutable-subject guide](https://learn.microsoft.com/en-us/entra/workload-id/workload-identities-github-immutable-subjects).

The GitHub environment permits tags matching `v*` and the `main` branch. Published releases use tags. The manual identity check runs only on `main` and cannot publish an extension. Keep these environment restrictions when changing the workflow.

### Grant Marketplace access

Run **Actions → Publish to VS Code Marketplace → Run workflow** on `main`. This manual run authenticates and displays **Marketplace identity ID** in its summary, then checks publishing rights. It never uploads a package. On the first run, the rights check can fail until the next step is complete.

Open [Visual Studio Marketplace publisher management](https://marketplace.visualstudio.com/manage/publishers/JDeffner), select **Members**, and add the returned identity ID as **Contributor**. Use the ID returned by the profile API, not the app's client ID or application object ID. Microsoft's [publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace) describes this publisher membership step. Rerun the manual workflow to verify access before making a release.

If the profile API cannot resolve the identity, check whether the app's service principal must first be added to an Azure DevOps organization connected to the tenant. For that organization step, use the service principal object ID from **Enterprise applications**, not the application-registration object ID. See [Azure DevOps service-principal setup](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/service-principal-managed-identity). Keep the profile API failure distinct from a publisher permission failure; neither means that a package was uploaded.

The extension publisher and helper default ID are now `JDeffner` and `JDeffner.live-webview`. The old GitHub v0.1.0 download uses `local.live-webview`; use its matching old helper, or pass `companionId: 'local.live-webview'` explicitly when testing that old VSIX with a newer helper. New source packages use the Marketplace identity. No Marketplace upload has been performed as part of preparing this workflow.

The earlier PAT workflow has been replaced. A saved `VSCE_PAT` secret is no longer referenced. Global Azure DevOps PATs retire on **1 December 2026**; the current workflow obtains short-lived Entra credentials for each run.

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
| Manual workflow run on `main` | Identity and publisher-access verification only, no upload |

Use a new numeric version for each upload, including a switch from prerelease to stable. Editing an existing release's checkbox does not republish or convert its Marketplace version. Prerelease users can receive a higher stable version, so plan version ordering for both channels. These constraints come from [VS Code's prerelease rules](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#pre-release-extensions). The workflow uses [`release: published`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#release) because it covers both stable releases and prereleases, including publication from drafts.

## Configuration or authentication failures

Missing client or tenant IDs stop the job before login. A federated-credential mismatch fails in **Sign in with the GitHub federated identity**; compare the error's subject with the exact Azure subject above. Azure may need a short time to propagate a new credential. Publisher authorization errors mean the login succeeded but the identity still needs access under `JDeffner`.

Use the manual identity check to test configuration without releasing. Adding configuration does not retroactively trigger old releases. The existing v0.1.0 tag predates this workflow. Publish a new release from the updated source to trigger upload. Releases created by another workflow with its default `GITHUB_TOKEN` may not trigger a second workflow; create the release through GitHub's UI, your authenticated CLI, or an appropriately configured GitHub App.

If the Marketplace already accepted the version, inspect it before retrying. The workflow does not ignore duplicate-version errors or delete published versions. It publishes only the VS Code extension; it does not publish the helper to npm or replace GitHub release attachments.

## Check locally without uploading

```sh
pnpm package --pre-release
pnpm prepare-fixture
pnpm integration-test --packaged --independent
```

Use `pnpm package` without the flag to build a stable VSIX. Output names follow the extension and helper manifest versions. Packaging never publishes and needs no Azure login. Azure Login removes its runner login session during post-job cleanup; the workflow does not write tokens to source, artifacts, or logs.
