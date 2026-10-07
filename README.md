# GitOps CLI

Command-line interface for GitOps Platform.

## Installation

```bash
npm install --global @getgitops/cli
```

## Vault

Export the secrets of a project path to a local file:

```bash
gops vault export \
	--api-url https://cloud.getgitops.com/api \
	--api-key "$GOPS_API_KEY" \
	--project-id 00000000-0000-0000-0000-000000000000 \
	--path / \
	--env production \
	--format env \
	--output .env.production
```

`--format` accepts `env` and `json`. Run a command with the path's secrets
injected as environment variables:

```bash
gops vault run \
	--api-url https://cloud.getgitops.com/api \
	--api-key "$GOPS_API_KEY" \
	--project-id 00000000-0000-0000-0000-000000000000 \
	--path / \
	--env production \
	-- "echo $API_KEY"
```

Manage an individual secret with `create`, `get`, `update`, or `delete`:

```bash
gops vault secret create \
	--api-url https://cloud.getgitops.com/api \
	--api-key "$GOPS_API_KEY" \
	--project-id 00000000-0000-0000-0000-000000000000 \
	--path /database \
	--key DB_PASSWORD \
	--env production \
	--value "$DB_PASSWORD"

gops vault secret get \
	--api-url https://cloud.getgitops.com/api \
	--api-key "$GOPS_API_KEY" \
	--project-id 00000000-0000-0000-0000-000000000000 \
	--path /database \
	--key DB_PASSWORD

gops vault secret update \
	--api-url https://cloud.getgitops.com/api \
	--api-key "$GOPS_API_KEY" \
	--project-id 00000000-0000-0000-0000-000000000000 \
	--path /database \
	--key DB_PASSWORD \
	--env production \
	--value "$NEW_DB_PASSWORD"

gops vault secret delete \
	--api-url https://cloud.getgitops.com/api \
	--api-key "$GOPS_API_KEY" \
	--project-id 00000000-0000-0000-0000-000000000000 \
	--path /database \
	--key DB_PASSWORD
```

## CI

`gops creport scan` detects GitHub Actions, GitLab CI, Bitbucket Pipelines and
Jenkins, and fills the git metadata (branch, commit, author, repository URL and
ref) automatically. The `--git-*` flags take precedence.

## External tools

`gops creport scan` downloads Trivy, Syft and Gitleaks on first use into
`~/.gitops-cli/tools/<tool>/<version>/`. Versions are pinned in
`src/utils/tool-versions.ts`, together with the SHA-256 of every release
archive; a download whose checksum does not match is rejected.

Run `gops tools install` to download them ahead of time (for example, when
building a Docker image). `GOPS_TOOLS_DIR` changes the install directory.

That file is generated, do not edit it by hand. To review and bump versions
(for example, monthly):

```bash
npm run tools:update                                  # pinned vs. available versions
npm run tools:update -- trivy=0.75.0 syft=1.54.0      # pin new versions
```

Releases younger than 7 days are refused by default (`--allow-recent` overrides
it) to leave time for a compromised release to be detected. Review the upstream
release notes, commit the regenerated file and publish a new CLI version.

## Releases

Releases are published automatically to npm and GitHub when a version tag is
pushed. Before the first release, add an npm automation or granular access token
as the `NPM_TOKEN` Actions secret in the GitHub repository settings. The token
must have permission to publish packages under the `@getgitops` scope.

To release a new version:

```bash
npm version patch # or minor / major
git push origin main --follow-tags
```

The tag must use the `vX.Y.Z` format and match the version in `package.json`.
The workflow validates and builds the package, publishes it with npm provenance,
and creates a GitHub Release with generated release notes.
