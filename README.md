# @hardmachinelabs/zod-config

[![CI](https://github.com/jordachmakaya/zod-config/actions/workflows/ci.yml/badge.svg)](https://github.com/jordachmakaya/zod-config/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@hardmachinelabs/zod-config.svg)](https://www.npmjs.com/package/@hardmachinelabs/zod-config)
[![npm downloads](https://img.shields.io/npm/dm/@hardmachinelabs/zod-config.svg)](https://www.npmjs.com/package/@hardmachinelabs/zod-config)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)

Type-safe Zod v4 configuration utilities for TypeScript and NestJS.

`process.env` is stringly typed, noisy, and easy to misuse. Booleans become traps, required values fail too late, and validation errors can accidentally expose secrets.

`@hardmachinelabs/zod-config` lets you validate environment-like objects with Zod, infer the parsed TypeScript type, and read config through a small typed `ConfigReader`.

You get early validation, typed access, redaction-safe errors, and an optional NestJS adapter without importing NestJS from the root package.


![Zod Config by Jordach Makaya](https://raw.githubusercontent.com/jordachmakaya/zod-config/main/assets/zod-config-by-jordach-makaya.png)


## What You Get

- Validate environment-like objects with Zod v4.
- Infer TypeScript types from the parsed Zod output.
- Read config values with `config.get('KEY')`.
- Avoid `Boolean("false") === true` with `z.stringbool()`.
- Keep sensitive values out of validation error messages.
- Use NestJS through an optional `./nest` adapter.
- Use an explicit global bridge only when your app needs one.

## Features

- Zod v4 as the source of truth.
- Typed config inference with `InferEnv`.
- Runtime validation with `createEnvValidator`.
- Typed reads with `ConfigReader`.
- Redaction-safe `EnvValidationError`.
- Sensitive key metadata through `sensitiveKeys`.
- Safe formatting with `formatValidationError()`.
- Safe value display with `redactValue()`.
- Immutable config by default with opt-out via `{ freeze: false }`.
- Optional NestJS adapter via `@hardmachinelabs/zod-config/nest`.
- Explicit global bridge via `@hardmachinelabs/zod-config/global`.
- Test reset helper via `@hardmachinelabs/zod-config/testing`.
- Root export remains core-only.
- ESM + CJS builds.
- Strict TypeScript.
- Changesets release workflow.

## Installation

Core usage:

```bash
pnpm add @hardmachinelabs/zod-config zod
```

NestJS usage:

```bash
pnpm add @hardmachinelabs/zod-config zod @nestjs/common @nestjs/config
```

`@nestjs/core` is not a direct peer dependency of this package.

## Core Usage

```ts
import { z } from 'zod'
import {
  ConfigReader,
  createEnvValidator,
  type InferEnv,
} from '@hardmachinelabs/zod-config/core'

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  EMAIL_ENABLED: z.stringbool().default(false),
  DATABASE_URL: z.string().min(1),
})

type Env = InferEnv<typeof schema>

const validateEnv = createEnvValidator({
  schema,
  sensitiveKeys: ['DATABASE_URL'],
})

const values = validateEnv(process.env)
const config = new ConfigReader<Env>(values)

const port = config.get('PORT')
```

## NestJS Usage

```ts
import { Injectable } from '@nestjs/common'
import { z } from 'zod'
import type { InferEnv } from '@hardmachinelabs/zod-config/core'
import {
  createZodConfigModule,
  ZodConfigService,
} from '@hardmachinelabs/zod-config/nest'

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  EMAIL_ENABLED: z.stringbool().default(false),
})

type Env = InferEnv<typeof schema>

export const AppConfigModule = createZodConfigModule({
  schema,
  envFilePath: ['.env'],
  ignoreEnvFile: process.env.NODE_ENV === 'production',
  sensitiveKeys: ['DATABASE_URL'],
})

@Injectable()
export class SomeService {
  constructor(private readonly config: ZodConfigService<Env>) {}

  getPort(): number {
    return this.config.get('PORT')
  }
}
```

## Global Bridge

The global bridge is secondary and explicit. Import it from the `./global`
subpath:

```ts
import {
  getZodConfig,
  setZodConfig,
} from '@hardmachinelabs/zod-config/global'
import { ConfigReader } from '@hardmachinelabs/zod-config/core'

const config = new ConfigReader({
  PORT: 3000,
})

setZodConfig(config)
getZodConfig<{ PORT: number }>().get('PORT')
```

The root package does not export the global bridge.

## Testing Reset

Tests can reset the global bridge through the `./testing` subpath:

```ts
import { resetZodConfigForTests } from '@hardmachinelabs/zod-config/testing'

afterEach(() => {
  resetZodConfigForTests()
})
```

The reset helper is not exported from the root package or from `./global`.

## Security Model

- `EnvValidationError` messages do not include raw sensitive values.
- `EnvValidationIssue` stores `code`, `path`, and `sensitive`, but not raw input.
- `sensitiveKeys` marks schema keys that must be treated as sensitive.
- `redactValue()` masks sensitive values and does not dump objects or arrays.
- The library does not log automatically.

## Behavior Notes

- Unknown keys are stripped when the user schema is a standard `z.object`.
- `z.stringbool()` avoids the `Boolean("false") === true` trap.
- Zod defaults, coercion, and transforms are preserved.
- `ConfigReader` deep-freezes the received object by default.
- Pass `{ freeze: false }` to `ConfigReader` to opt out of freezing.
- The Nest adapter relies on the `@nestjs/config` `validate` lifecycle. It
  captures the validated Zod output once to build the internal `ConfigReader`,
  avoiding double parsing and Zod schema introspection.

## Public Exports

- `@hardmachinelabs/zod-config`: core exports only.
- `@hardmachinelabs/zod-config/core`: core exports.
- `@hardmachinelabs/zod-config/nest`: NestJS adapter.
- `@hardmachinelabs/zod-config/global`: explicit global bridge.
- `@hardmachinelabs/zod-config/testing`: test-only reset helper.

## Documentation

- [Getting started](docs/guide/getting-started.md)
- [Core](docs/guide/core.md)
- [NestJS adapter](docs/guide/nest.md)
- [Global bridge](docs/guide/global-bridge.md)
- [Testing](docs/guide/testing.md)
- [Error handling](docs/guide/error-handling.md)
- [Security](docs/guide/security.md)
- [Limitations](docs/guide/limitations.md)
- [About](docs/about.md)

These links are primarily for the GitHub repository. The npm package publishes
only `dist`, `README.md`, `LICENSE`, and `package.json`.

## Examples

- [Core basic](docs/examples/core-basic.md)
- [Nest basic](docs/examples/nest-basic.md)
- [Global bridge](docs/examples/global-bridge.md)

Examples are kept in the repository and are not included in the npm tarball.

## Documentation Site

This repository includes a VitePress documentation site.

Local development:

```bash
pnpm run docs:dev
pnpm run docs:build
pnpm run docs:preview
```

Technical documentation is deployed with GitHub Pages:

https://jordachmakaya.github.io/zod-config/

The main project page is:

https://jordach.dev/tools/zod-config

## Release Workflow

Release is maintainer-only.

```bash
pnpm changeset
pnpm run version-packages
pnpm run pack:dry-run
pnpm run release
```

Do not run `pnpm run release` without explicit maintainer approval.

## Contributing

See `CONTRIBUTING.md` for local setup, checks, and changeset guidance.


## Maintainer

Built and maintained by **Jordach Makaya**.

- Portfolio: https://jordach.dev
- Project page: https://jordach.dev/tools/zod-config
- LinkedIn: https://www.linkedin.com/in/jordachmakaya/

## License

MIT
