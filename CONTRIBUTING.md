# Contributing

Thanks for helping improve `@hardmachinelabs/zod-config`. This project is small on
purpose: keep changes focused, tested, and explicit.

## Prerequisites

- Node.js >= 18
- pnpm 10

## Local setup

1. Fork and clone the repository.
2. Install dependencies:

```bash
pnpm install
```

## Local checks

Run these before opening a pull request:

```bash
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:types
pnpm run pack:dry-run
```

## Branch naming

Use short, descriptive branch names:

- `fix/redaction-message`
- `feat/nest-option`
- `docs/readme-usage`
- `test/unknown-env-keys`

## Pull request workflow

- Keep PRs small and focused.
- Explain the behavior change and why it is needed.
- Include tests for runtime behavior and type-level behavior when relevant.
- Avoid unrelated refactors.
- Do not commit generated secrets, local config, or credentials.

## Changesets

Add a changeset when a change affects the published package:

```bash
pnpm changeset
```

Version guidance:

- `patch`: bug fixes, internal hardening, documentation fixes that affect usage.
- `minor`: new backwards-compatible public API or behavior.
- `major`: breaking changes to public API, exports, runtime behavior, or type contracts.

No changeset is usually needed for tests-only, CI-only, or internal maintenance
that does not affect the published package.

## Release

Releases are maintainer-only. Do not run `pnpm run release` unless a maintainer
has explicitly approved the release.

## Project safety rules

- Do not put secrets in tests, snapshots, logs, or examples.
- Do not add automatic logs by default.
- Do not add `console.*` to library code.
- Do not read `process.env` from the core package.
- Do not import NestJS from `src/core`.
- Keep the root export core-only.
