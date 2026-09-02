# GitOps CLI

Command-line interface for GitOps Platform.

## Installation

```bash
npm install --global @getgitops/cli
```

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
