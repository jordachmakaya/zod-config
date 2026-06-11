# Global Bridge

The global bridge is optional and secondary. It exists for application code that
needs explicit process-wide access to a `ConfigReader`.

```ts
import { ConfigReader } from '@hardmachinelabs/zod-config/core'
import {
  getZodConfig,
  hasZodConfig,
  setZodConfig,
} from '@hardmachinelabs/zod-config/global'

type Env = {
  PORT: number
}

setZodConfig(new ConfigReader<Env>({ PORT: 3000 }))

if (hasZodConfig()) {
  getZodConfig<Env>().get('PORT')
}
```

The bridge is not exported from `@hardmachinelabs/zod-config`. There is no proxy API
such as `env.PORT`.
