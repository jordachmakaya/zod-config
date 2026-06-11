# NestJS Adapter

The NestJS adapter connects `@hardmachinelabs/zod-config` to the
`@nestjs/config` lifecycle.

It is useful when you want the Nest application to fail during boot if the
environment is invalid, then inject a typed config service everywhere else.
After setup, services do not need to call `Number(...)`, `Boolean(...)`, manual
fallbacks, or local validation helpers. The schema becomes the single place to
fix and extend configuration.

## Step 1 - Install the NestJS Peers

Install the package, Zod, and the Nest peer dependencies used by the adapter:

```bash
pnpm add @hardmachinelabs/zod-config zod @nestjs/common @nestjs/config
```

What you get:

- the pure core package;
- the Nest adapter from `@hardmachinelabs/zod-config/nest`;
- `@nestjs/config` as the `.env` loading integration.

Behind the scenes:

- the root package stays core-only;
- NestJS code lives behind the `./nest` subpath;
- projects that only use the core do not need to import the Nest adapter.

## Step 2 - Define the Schema

Create a schema for the environment variables your Nest application needs:

```ts
import { z } from 'zod'
import type { InferEnv } from '@hardmachinelabs/zod-config/core'

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  EMAIL_ENABLED: z.stringbool().default(false),
})

type Env = InferEnv<typeof schema>
```

What you get:

- `PORT` is a `number`;
- `DATABASE_URL` is required;
- `EMAIL_ENABLED` is a real `boolean`;
- the `Env` type follows the parsed Zod output.

Behind the scenes:

- Zod handles defaults, coercion, boolean parsing, and transforms;
- the library does not duplicate Zod validation logic;
- unknown-key behavior follows the schema you choose.

## Step 3 - Create the Config Module

Create a module once, usually next to your application module:

```ts
import { createZodConfigModule } from '@hardmachinelabs/zod-config/nest'

export const AppConfigModule = createZodConfigModule({
  schema,
  envFilePath: ['.env'],
  ignoreEnvFile: process.env.NODE_ENV === 'production',
  sensitiveKeys: ['DATABASE_URL'],
  freeze: true,
  isGlobal: true,
})
```

Only `schema` is required. Every other option is optional.

### Config Module Options

| Option | Required | Default | What it does |
| --- | --- | --- | --- |
| `schema` | yes | none | Zod schema used to validate and parse the final config object. |
| `envFilePath` | no | `@nestjs/config` default | Passed to `ConfigModule.forRoot()` to choose one or more `.env` files. |
| `ignoreEnvFile` | no | `@nestjs/config` default | Passed to `ConfigModule.forRoot()` to skip `.env` loading, often in production. |
| `sensitiveKeys` | no | `[]` | Marks keys as sensitive in validation issues, so error formatting can treat them as secrets. |
| `freeze` | no | `true` | Controls whether the validated config object is deep-frozen by `ConfigReader`. |
| `isGlobal` | no | `true` | Controls whether the generated Nest module is global. |

#### `sensitiveKeys`

Use `sensitiveKeys` for values such as database URLs, API keys, tokens, SMTP
passwords, or signing secrets:

```ts
export const AppConfigModule = createZodConfigModule({
  schema,
  sensitiveKeys: ['DATABASE_URL', 'JWT_SECRET', 'SMTP_PASS'],
})
```

What it does:

- marks matching validation issues with `sensitive: true`;
- lets the error layer format failures without exposing secret values;
- keeps the key name visible, so the developer still knows what to fix.

If you omit it:

- validation still works;
- errors still do not dump the full environment object;
- issues for those keys are not marked as sensitive.

As a rule, add every secret-like key to `sensitiveKeys`. It costs almost
nothing and makes future logging or error display safer.

For example, an application logger can report the failed keys without exposing
the secret values:

```ts
import { Logger } from '@nestjs/common'
import {
  EnvValidationError,
  formatValidationError,
} from '@hardmachinelabs/zod-config/core'

const logger = new Logger('Bootstrap')

try {
  await bootstrap()
} catch (error) {
  if (error instanceof EnvValidationError) {
    logger.error(formatValidationError(error.issues))
    process.exit(1)
  }

  throw error
}
```

If `DATABASE_URL` or `JWT_SECRET` is invalid, the log can mention the key name
and Zod issue code, but not the raw secret value.

#### `freeze`

By default, the validated config is immutable:

```ts
export const AppConfigModule = createZodConfigModule({
  schema,
  freeze: true,
})
```

What it does:

- deep-freezes the validated config object received by `ConfigReader`;
- prevents accidental mutation of config at runtime;
- makes config behave like application constants after boot.

If you omit it:

- the behavior is the same as `freeze: true`;
- the config is still deep-frozen by default.

Use `freeze: false` only when a test or integration needs mutable values:

```ts
export const AppConfigModule = createZodConfigModule({
  schema,
  freeze: false,
})
```

With `freeze: false`, the validated config can be mutated by application code.
That is usually not what you want in production.

#### `isGlobal`

By default, the generated module is global:

```ts
export const AppConfigModule = createZodConfigModule({
  schema,
  isGlobal: true,
})
```

If you omit it:

- the behavior is the same as `isGlobal: true`;
- `ZodConfigService` can be injected across the app after importing
  `AppConfigModule` once in the root module.

Use `isGlobal: false` when you want standard Nest module scoping and explicit
imports in the modules that need config.

Then import it once in the root module:

```ts
import { Module } from '@nestjs/common'

@Module({
  imports: [AppConfigModule],
})
export class AppModule {}
```

What you get:

- config validation during Nest boot;
- redaction-safe validation errors for sensitive keys;
- immutable validated config by default;
- a `ZodConfigService` provider available to the app.

Behind the scenes:

- the adapter delegates validation to `createEnvValidator({ schema,
  sensitiveKeys })`;
- it uses the `@nestjs/config` `validate` lifecycle;
- it captures the validated Zod output once to build the internal
  `ConfigReader`;
- this avoids double parsing and avoids fragile Zod schema introspection.

## Step 4 - Inject the Typed Service

Inject `ZodConfigService<Env>` where you need configuration:

```ts
import { Injectable } from '@nestjs/common'
import { ZodConfigService } from '@hardmachinelabs/zod-config/nest'

@Injectable()
export class ApiService {
  constructor(private readonly config: ZodConfigService<Env>) {}

  port(): number {
    return this.config.get('PORT')
  }

  emailEnabled(): boolean {
    return this.config.get('EMAIL_ENABLED')
  }
}
```

What you get:

- `this.config.get('PORT')` returns `number`;
- `this.config.get('EMAIL_ENABLED')` returns `boolean`;
- unknown keys fail at compile time.

Behind the scenes:

- `ZodConfigService` wraps `ConfigReader`;
- it reads only the validated object captured during boot;
- it does not read `process.env`;
- it does not log anything by default.

## One Application Config

The Nest adapter is intentionally centered on one application config.

That means you create one `AppConfigModule`, import it once, and inject
`ZodConfigService<Env>` wherever you need config. By default, the generated Nest
module is global, so feature modules can inject the service without re-importing
the config module.

```ts
export const AppConfigModule = createZodConfigModule({
  schema,
})
```

Why it exists:

- most applications need one authoritative environment config;
- validating once prevents different modules from parsing the same environment
  differently;
- `main.ts` can read the same validated config used by the rest of the app;
- a single service avoids scattered fixes like `Number(process.env.PORT)`,
  `Boolean(process.env.EMAIL_ENABLED)`, or repeated fallback logic;
- consumers read typed values instead of repairing raw strings.

How to use it:

1. Define the schema once.
2. Create `AppConfigModule` once.
3. Import it in `AppModule`.
4. Read it in `main.ts` for bootstrap settings.
5. Inject `ZodConfigService<Env>` anywhere else in the app.

The most common bootstrap use case is the HTTP port:

```ts
import { NestFactory } from '@nestjs/core'
import { ZodConfigService } from '@hardmachinelabs/zod-config/nest'
import { AppModule } from './app.module'
import type { Env } from './config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ZodConfigService<Env>)

  await app.listen(config.get('PORT'))
}

void bootstrap()
```

What you get:

- `main.ts` uses the validated `PORT`;
- no `Number(process.env.PORT)` in the bootstrap file;
- no fallback value duplicated outside the schema;
- the app fails during boot if required config is invalid.

Behind the scenes:

- Nest creates `AppConfigModule` during application startup;
- `@nestjs/config` runs the Zod validator before providers depend on config;
- `app.get(ZodConfigService<Env>)` retrieves the same Nest provider that
  application services inject.

If you do not want a global Nest module, set `isGlobal: false` and import the
module only where Nest dependency injection needs it:

```ts
export const AppConfigModule = createZodConfigModule({
  schema,
  isGlobal: false,
})
```

The separate `@hardmachinelabs/zod-config/global` bridge is also available for
non-Nest code that cannot use dependency injection. It is explicit and
secondary; the Nest adapter does not set that bridge automatically.

## Adding a New Environment Variable

Adding a new config value should be boring. Add it to the schema, then read it
through the service.

### Step 1 - Add the Key to the Schema

```ts
const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  EMAIL_ENABLED: z.stringbool().default(false),
  REDIS_URL: z.string().url(),
})
```

What you get:

- `REDIS_URL` is validated during boot;
- the application fails early if the value is missing or invalid;
- the inferred `Env` type updates automatically.

Behind the scenes:

- `InferEnv<typeof schema>` now includes `REDIS_URL`;
- no separate interface needs to be kept in sync;
- the Nest service receives the transformed Zod output.

### Step 2 - Read It Where Needed

```ts
@Injectable()
export class CacheService {
  constructor(private readonly config: ZodConfigService<Env>) {}

  connect() {
    return connectToRedis(this.config.get('REDIS_URL'))
  }
}
```

What you get:

- typed access at the usage site;
- no repeated string validation;
- no local fallback logic;
- no ad hoc parsing in every service.

Behind the scenes:

- services stay focused on their own job;
- configuration correctness stays centralized in the schema;
- when a config rule changes, you update the schema instead of repairing many
  call sites.

## Complete Example

```ts
import { Injectable, Module } from '@nestjs/common'
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
  freeze: true,
  isGlobal: true,
})

@Injectable()
export class ApiService {
  constructor(private readonly config: ZodConfigService<Env>) {}

  port(): number {
    return this.config.get('PORT')
  }
}

@Module({
  imports: [AppConfigModule],
  providers: [ApiService],
})
export class AppModule {}
```
