# Global Bridge

```ts
import { z } from 'zod'
import {
  ConfigReader,
  createEnvValidator,
  type InferEnv,
} from '@hardmachinelabs/zod-config/core'
import {
  getZodConfig,
  setZodConfig,
} from '@hardmachinelabs/zod-config/global'

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
})

type Env = InferEnv<typeof schema>

const validateEnv = createEnvValidator({ schema })
const values = validateEnv(process.env)

setZodConfig(new ConfigReader<Env>(values))

export function getPort(): number {
  return getZodConfig<Env>().get('PORT')
}
```

Reset this state in tests with `resetZodConfigForTests` from
`@hardmachinelabs/zod-config/testing`.
