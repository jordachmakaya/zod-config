# Getting Started

`@hardmachinelabs/zod-config` is a small TypeScript configuration library built on
top of Zod v4.

It solves a common problem in Node.js applications: environment variables arrive
as untyped strings, often mixed with many unrelated `process.env` keys, while
the application needs a validated, typed, safe-to-read configuration object.

The package gives you:

- a pure Zod-based validator for environment-like objects;
- typed access to validated values with `ConfigReader`;
- redaction-safe validation errors for secrets;
- an optional NestJS adapter through `@hardmachinelabs/zod-config/nest`;
- a secondary global bridge through `@hardmachinelabs/zod-config/global`.

The core does not load `.env` files, does not read `process.env`, and does not
mutate `process.env`. You decide where the input comes from, then the library
validates it.

## Step 1 - Install the Package

Install the library and Zod:

```bash
pnpm add @hardmachinelabs/zod-config zod
```

If you use NestJS, also install the Nest peer dependencies in your application:

```bash
pnpm add @nestjs/common @nestjs/config
```

What you get:

- `@hardmachinelabs/zod-config/core` for framework-independent validation;
- `@hardmachinelabs/zod-config/nest` for the optional NestJS adapter;
- `zod` as the schema engine.

Behind the scenes:

- Zod remains your source of truth for parsing, defaults, coercion, transforms,
  and unknown-key behavior;
- the root package stays core-only, so installing the core does not force NestJS
  into projects that do not use it.

## Step 2 - Define Your Environment Schema

Create a Zod schema that describes the configuration your app actually needs:

```ts
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  EMAIL_ENABLED: z.stringbool().default(false),
})
```

What you get:

- `PORT` becomes a `number`, even if the input was the string `"3000"`;
- `DATABASE_URL` is required and must be non-empty;
- `EMAIL_ENABLED` becomes a real `boolean`, so `"false"` is not treated as
  truthy by mistake;
- missing values can use Zod defaults.

Behind the scenes:

- `z.coerce.number()` handles numeric string input;
- `z.stringbool()` parses common boolean strings such as `"true"`, `"false"`,
  `"1"`, `"0"`, `"yes"`, and `"no"`;
- with a normal `z.object`, unknown keys are stripped by Zod from the validated
  result.

## Step 3 - Infer the TypeScript Type

Infer the TypeScript type from the schema:

```ts
import type { InferEnv } from '@hardmachinelabs/zod-config/core'

type Env = InferEnv<typeof schema>
```

What you get:

- one source of truth: the Zod schema;
- a TypeScript `Env` type that matches the parsed output, not the raw input;
- typed config reads later, such as `config.get('PORT')` returning `number`.

Behind the scenes:

- `InferEnv<TSchema>` maps to the Zod output type;
- defaults, coercions, and transforms are reflected in the resulting TypeScript
  type.

## Step 4 - Create the Validator

Create a validator once, then call it with an environment-like object:

```ts
import { createEnvValidator } from '@hardmachinelabs/zod-config/core'

const validateEnv = createEnvValidator({
  schema,
  sensitiveKeys: ['DATABASE_URL'],
})

const values = validateEnv(process.env)
```

What you get:

- `values` contains only the parsed Zod output;
- sensitive keys are marked internally for safe error formatting;
- invalid configuration throws `EnvValidationError`.

Behind the scenes:

- the core accepts `Record<string, unknown>`;
- passing `process.env` is only a usage choice in your application code;
- the library does not read from `process.env` by itself;
- the library does not write to or mutate `process.env`;
- raw sensitive values are not stored in validation issues.

## Step 5 - Read Values Through ConfigReader

Wrap the validated values with `ConfigReader`:

```ts
import { ConfigReader } from '@hardmachinelabs/zod-config/core'

const config = new ConfigReader<Env>(values)

const port = config.get('PORT')
const emailEnabled = config.get('EMAIL_ENABLED')
```

What you get:

- `port` is typed as `number`;
- `emailEnabled` is typed as `boolean`;
- unknown keys fail at compile time:

```ts
config.get('UNKNOWN_KEY')
```

Behind the scenes:

- `ConfigReader` only reads from the validated object passed to its constructor;
- it never reads `process.env`;
- it deep-freezes the received object by default to avoid accidental mutation.

## Built-in Error Handling

The package includes a small set of built-in error helpers so applications can
fail clearly without leaking secrets.

Available from `@hardmachinelabs/zod-config/core`:

- `EnvValidationError` for invalid environment validation;
- `formatValidationError()` for redaction-safe validation messages;
- `ConfigReaderError` for invalid runtime reads from `ConfigReader`;
- `redactValue()` for safe display of individual values;
- `REDACTED_VALUE` for a stable redaction marker;
- `EnvValidationIssue` for typed validation issue metadata.

This page only introduces them. See [Error Handling](./error-handling.md) for
the complete list and usage examples.

## Complete Core Example

```ts
import { z } from 'zod'
import {
  ConfigReader,
  createEnvValidator,
  type InferEnv,
} from '@hardmachinelabs/zod-config/core'

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  EMAIL_ENABLED: z.stringbool().default(false),
})

type Env = InferEnv<typeof schema>

const validateEnv = createEnvValidator({
  schema,
  sensitiveKeys: ['DATABASE_URL'],
})

const values = validateEnv(process.env)
const config = new ConfigReader<Env>(values)

const port = config.get('PORT')
const emailEnabled = config.get('EMAIL_ENABLED')
```

## Next Steps

- Use the [Core](./core.md) guide for framework-independent applications.
- Use the [NestJS Adapter](./nest.md) guide for NestJS applications.
- Read [Error Handling](./error-handling.md) for the complete error helper
  reference.
- Read [Security](./security.md) before logging or displaying validation
  failures.
- Read [Limitations](./limitations.md) for the intentionally small package
  scope.
