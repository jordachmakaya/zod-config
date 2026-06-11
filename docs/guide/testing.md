# Testing

`@hardmachinelabs/zod-config` is designed to be easy to test because the core is
pure. Most tests can pass a plain object to the validator instead of touching
`process.env`.

The only test-only public API is:

```ts
import { resetZodConfigForTests } from '@hardmachinelabs/zod-config/testing'
```

It resets the secondary global bridge. It does not reset NestJS, does not clear
`process.env`, and is not needed for normal core tests.

## What You Usually Test

For application code, useful tests usually cover:

- the schema parses strings into the types your app expects;
- defaults are applied;
- invalid values fail during validation;
- sensitive values never appear in error messages;
- `ConfigReader` returns typed values;
- the global bridge is reset between tests if your app uses it;
- the Nest adapter boots with valid config and fails with invalid config.

## Testing the Core Validator

The core validator accepts `Record<string, unknown>`, so tests can use plain
objects:

```ts
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  ConfigReader,
  createEnvValidator,
  type InferEnv,
} from '@hardmachinelabs/zod-config/core'

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  EMAIL_ENABLED: z.stringbool().default(false),
  DATABASE_URL: z.string().url(),
})

type Env = InferEnv<typeof schema>

describe('config', () => {
  it('validates and reads typed values', () => {
    const validateEnv = createEnvValidator({
      schema,
      sensitiveKeys: ['DATABASE_URL'],
    })

    const values = validateEnv({
      PORT: '4000',
      EMAIL_ENABLED: 'false',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
    })

    const config = new ConfigReader<Env>(values)

    expect(config.get('PORT')).toBe(4000)
    expect(config.get('EMAIL_ENABLED')).toBe(false)
  })
})
```

What this gives you:

- no dependency on the real machine environment;
- no `process.env` cleanup;
- deterministic tests for defaults, coercion, and boolean parsing.

## Testing Validation Errors

When validation fails, `createEnvValidator()` throws `EnvValidationError`:

```ts
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  EnvValidationError,
  createEnvValidator,
  formatValidationError,
} from '@hardmachinelabs/zod-config/core'

const schema = z.object({
  PORT: z.coerce.number().int(),
  EMAIL_ENABLED: z.stringbool(),
  DATABASE_URL: z.string().url(),
})

describe('config errors', () => {
  it('does not leak sensitive values', () => {
    const validateEnv = createEnvValidator({
      schema,
      sensitiveKeys: ['DATABASE_URL'],
    })

    const secret = 'not-a-valid-url-with-secret-token'

    expect(() =>
      validateEnv({
        PORT: '3000',
        EMAIL_ENABLED: 'true',
        DATABASE_URL: secret,
      }),
    ).toThrow(EnvValidationError)

    try {
      validateEnv({
        PORT: '3000',
        EMAIL_ENABLED: 'true',
        DATABASE_URL: secret,
      })
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError)

      const validationError = error as EnvValidationError
      const formatted = formatValidationError(validationError.issues)

      expect(validationError.message).toContain('DATABASE_URL')
      expect(validationError.message).not.toContain(secret)
      expect(formatted).not.toContain(secret)
      expect(validationError.issues[0]).not.toHaveProperty('rawValue')
    }
  })
})
```

What this verifies:

- the failing key is visible;
- the raw secret is not visible;
- formatted errors stay safe;
- issue metadata does not store raw values.

## Testing ConfigReader Immutability

`ConfigReader` deep-freezes the received object by default:

```ts
import { describe, expect, it } from 'vitest'
import { ConfigReader } from '@hardmachinelabs/zod-config/core'

describe('ConfigReader', () => {
  it('freezes nested values by default', () => {
    const values = {
      FEATURE_FLAGS: {
        beta: true,
      },
    }

    const config = new ConfigReader(values)

    expect(Object.isFrozen(config.get('FEATURE_FLAGS'))).toBe(true)
    expect(() => {
      config.get('FEATURE_FLAGS').beta = false
    }).toThrow(TypeError)
  })

  it('can opt out of freezing', () => {
    const values = {
      FEATURE_FLAGS: {
        beta: true,
      },
    }

    const config = new ConfigReader(values, { freeze: false })

    config.get('FEATURE_FLAGS').beta = false

    expect(config.get('FEATURE_FLAGS').beta).toBe(false)
  })
})
```

Use `{ freeze: false }` only when a test or integration intentionally needs
mutable values.

## Testing the Global Bridge

The global bridge stores one explicit process-local config instance. If a test
calls `setZodConfig()`, reset it after the test:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigReader } from '@hardmachinelabs/zod-config/core'
import {
  getZodConfig,
  hasZodConfig,
  setZodConfig,
} from '@hardmachinelabs/zod-config/global'
import { resetZodConfigForTests } from '@hardmachinelabs/zod-config/testing'

afterEach(() => {
  resetZodConfigForTests()
})

describe('global config bridge', () => {
  it('sets and reads the global config', () => {
    const config = new ConfigReader({
      PORT: 3000,
    })

    setZodConfig(config)

    expect(hasZodConfig()).toBe(true)
    expect(getZodConfig<{ PORT: number }>().get('PORT')).toBe(3000)
  })

  it('starts empty after reset', () => {
    expect(hasZodConfig()).toBe(false)
  })
})
```

Important boundaries:

- `resetZodConfigForTests` is exported only from `@hardmachinelabs/zod-config/testing`;
- it is not exported from the root package;
- it is not exported from `@hardmachinelabs/zod-config/global`;
- it only resets the global bridge state.

## Testing NestJS Modules

For NestJS tests, use `@nestjs/testing` and pass `ignoreEnvFile: true` when you
want the test to control the environment:

```ts
import 'reflect-metadata'
import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
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

describe('AppConfigModule', () => {
  it('injects typed config values', async () => {
    await withEnv(
      {
        PORT: '4100',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
        EMAIL_ENABLED: 'no',
      },
      async () => {
        const moduleRef = await Test.createTestingModule({
          imports: [
            createZodConfigModule({
              schema,
              ignoreEnvFile: true,
              sensitiveKeys: ['DATABASE_URL'],
            }),
          ],
        }).compile()

        const config = moduleRef.get<ZodConfigService<Env>>(ZodConfigService)

        expect(config.get('PORT')).toBe(4100)
        expect(config.get('EMAIL_ENABLED')).toBe(false)

        await moduleRef.close()
      },
    )
  })
})
```

`ignoreEnvFile: true` keeps the test independent from local `.env` files. The
adapter still uses the same `@nestjs/config` validation lifecycle as the real
application.

## Restoring process.env in Tests

If a test must write to `process.env`, restore the previous values in a
`finally` block:

```ts
async function withEnv(
  values: Record<string, string | undefined>,
  callback: () => Promise<void>,
): Promise<void> {
  const previousValues = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(values)) {
    previousValues.set(key, process.env[key])

    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    await callback()
  } finally {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}
```

Prefer plain-object core tests when possible. Use `process.env` mutation mainly
for Nest adapter tests where `@nestjs/config` is part of what you are testing.

## Testing Invalid NestJS Config

Invalid Nest config should fail during module compilation:

```ts
import { EnvValidationError } from '@hardmachinelabs/zod-config/core'

it('fails boot when config is invalid', async () => {
  await withEnv(
    {
      DATABASE_URL: '',
    },
    async () => {
      await expect(async () =>
        Test.createTestingModule({
          imports: [
            createZodConfigModule({
              schema,
              ignoreEnvFile: true,
              sensitiveKeys: ['DATABASE_URL'],
            }),
          ],
        }).compile(),
      ).rejects.toThrow(EnvValidationError)
    },
  )
})
```

This is the NestJS behavior you usually want: invalid configuration blocks boot
instead of failing later inside a service.

## Testing Type Safety

Runtime tests cannot prove TypeScript inference. Use a type-level test tool such
as `tsd` for public API contracts:

```ts
import { expectError, expectType } from 'tsd'
import { z } from 'zod'
import type { InferEnv } from '@hardmachinelabs/zod-config/core'
import { ZodConfigService } from '@hardmachinelabs/zod-config/nest'

const schema = z.object({
  PORT: z.coerce.number().int(),
  EMAIL_ENABLED: z.stringbool(),
})

type Env = InferEnv<typeof schema>

declare const service: ZodConfigService<Env>

expectType<number>(service.get('PORT'))
expectType<boolean>(service.get('EMAIL_ENABLED'))
expectError(service.get('UNKNOWN_KEY'))
```

Use runtime tests for behavior and type-level tests for compile-time guarantees.

## What Not to Do

Avoid these patterns:

```ts
import { resetZodConfigForTests } from '@hardmachinelabs/zod-config'
import { resetZodConfigForTests } from '@hardmachinelabs/zod-config/global'
```

The reset helper is intentionally available only from:

```ts
import { resetZodConfigForTests } from '@hardmachinelabs/zod-config/testing'
```

Also avoid logging raw environment objects in tests:

```ts
appLogger.error(process.env)
```

Prefer asserting that sensitive values are absent from error messages and
formatted errors.
