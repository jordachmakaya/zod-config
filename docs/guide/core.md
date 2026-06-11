# Core

The core package contains the validator, typed reader, redaction helpers, and
public types.

```ts
import { z } from 'zod'
import {
  ConfigReader,
  createEnvValidator,
  type InferEnv,
} from '@hardmachinelabs/zod-config/core'

const schema = z.object({
  PORT: z.coerce.number().int(),
  EMAIL_ENABLED: z.stringbool(),
})

type Env = InferEnv<typeof schema>

const validateEnv = createEnvValidator({ schema })
const values = validateEnv({
  PORT: '3000',
  EMAIL_ENABLED: 'false',
  EXTRA_KEY: 'ignored',
})

const config = new ConfigReader<Env>(values)

config.get('PORT')
config.get('EMAIL_ENABLED')
```

With a standard `z.object`, unknown keys are stripped by Zod. Defaults,
coercion, and transforms are preserved because the library returns Zod output.

`ConfigReader` freezes the received object by default. Use `{ freeze: false }`
only when a test or integration needs mutable values.
