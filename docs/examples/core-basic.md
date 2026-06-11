# Core Basic

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

The core validates the object you pass in. It does not read or mutate
`process.env` internally.
