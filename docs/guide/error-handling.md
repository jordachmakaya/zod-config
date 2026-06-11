# Error Handling

`@hardmachinelabs/zod-config` provides a small error-handling surface for invalid
configuration, invalid reads, and redaction-safe display.

The goal is simple: fail early, show developers what key needs attention, and
avoid leaking raw secret values.

## Public Error Utilities

Import these from `@hardmachinelabs/zod-config/core`:

```ts
import {
  ConfigReaderError,
  EnvValidationError,
  REDACTED_VALUE,
  formatValidationError,
  redactValue,
  type EnvValidationIssue,
} from '@hardmachinelabs/zod-config/core'
```

| Export | Kind | Use it for |
| --- | --- | --- |
| `EnvValidationError` | class | Catching validation failures thrown by `createEnvValidator()`. |
| `formatValidationError()` | function | Formatting validation issues without raw values. |
| `ConfigReaderError` | class | Catching missing-key reads from `ConfigReader`. |
| `redactValue()` | function | Safely converting one value for display or logs. |
| `REDACTED_VALUE` | constant | Reusing the stable redaction marker. |
| `EnvValidationIssue` | type | Typing issue metadata: `code`, `path`, and `sensitive`. |

## EnvValidationError

`createEnvValidator()` throws `EnvValidationError` when the input does not match
the Zod schema:

```ts
import { z } from 'zod'
import {
  EnvValidationError,
  createEnvValidator,
} from '@hardmachinelabs/zod-config/core'

const schema = z.object({
  PORT: z.coerce.number().int(),
  DATABASE_URL: z.string().url(),
})

const validateEnv = createEnvValidator({
  schema,
  sensitiveKeys: ['DATABASE_URL'],
})

try {
  validateEnv({
    PORT: 'abc',
    DATABASE_URL: 'postgres://user:password@host/db',
  })
} catch (error) {
  if (error instanceof EnvValidationError) {
    error.name
    error.message
    error.issues
  }

  throw error
}
```

What you get:

- `error.name` is `EnvValidationError`;
- `error.message` is redaction-safe;
- `error.issues` contains metadata, not raw input values.

## formatValidationError()

Use `formatValidationError()` when you want to format issues yourself:

```ts
import {
  EnvValidationError,
  formatValidationError,
} from '@hardmachinelabs/zod-config/core'

declare const appLogger: {
  error(message: string): void
}

try {
  validateEnv(input)
} catch (error) {
  if (error instanceof EnvValidationError) {
    const message = formatValidationError(error.issues)

    appLogger.error(message)
    process.exit(1)
  }

  throw error
}
```

The formatted message includes paths and Zod issue codes. It does not include
raw values from the environment.

Example output:

```txt
Invalid environment variables: PORT (invalid_type); DATABASE_URL (invalid_format)
```

## EnvValidationIssue

Each validation issue has this public shape:

```ts
type EnvValidationIssue = {
  readonly code: string
  readonly path: readonly PropertyKey[]
  readonly sensitive: boolean
}
```

What is intentionally absent:

- no `rawValue`;
- no `receivedValue`;
- no full `input`;
- no environment object dump.

This keeps the issue object safe to inspect in application code.

## ConfigReaderError

`ConfigReader.get()` is typed, so unknown keys should fail at compile time. If a
missing key is still requested at runtime, `ConfigReader` throws
`ConfigReaderError`. This mainly protects dynamic reads or incorrect casts:

```ts
import {
  ConfigReader,
  ConfigReaderError,
} from '@hardmachinelabs/zod-config/core'

declare const appLogger: {
  error(message: string): void
}

const config = new ConfigReader({
  PORT: 3000,
})

const keyFromRuntime = 'DATABASE_URL' as keyof { PORT: number }

try {
  config.get(keyFromRuntime)
} catch (error) {
  if (error instanceof ConfigReaderError) {
    appLogger.error(error.message)
  }
}
```

For normal usage, prefer the typed path:

```ts
config.get('PORT')
```

## redactValue()

`redactValue()` converts one value to a safe display string:

```ts
import { redactValue } from '@hardmachinelabs/zod-config/core'

redactValue('super-secret-token', true)
redactValue(3000, false)
redactValue({ nested: 'value' }, false)
redactValue(['a', 'b'], false)
```

Results:

```ts
'[REDACTED]'
'3000'
'[object]'
'[array]'
```

Objects and arrays are not dumped. Sensitive values always return the stable
redaction marker.

## REDACTED_VALUE

Use `REDACTED_VALUE` when you need the same marker in application code:

```ts
import { REDACTED_VALUE } from '@hardmachinelabs/zod-config/core'

const displayValue = REDACTED_VALUE
```

The value is:

```txt
[REDACTED]
```

## NestJS Bootstrap Example

In NestJS, validation usually runs during application boot. If you catch boot
errors, format only the library issues:

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

Do not log `process.env`, the original input object, or raw secret values.
