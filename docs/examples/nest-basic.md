# Nest Basic

```ts
import { Module, Injectable } from '@nestjs/common'
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

const AppConfigModule = createZodConfigModule({
  schema,
  envFilePath: ['.env'],
  ignoreEnvFile: process.env.NODE_ENV === 'production',
  sensitiveKeys: ['DATABASE_URL'],
})

@Injectable()
class ApiService {
  constructor(private readonly config: ZodConfigService<Env>) {}

  getPort(): number {
    return this.config.get('PORT')
  }
}

@Module({
  imports: [AppConfigModule],
  providers: [ApiService],
})
export class AppModule {}
```
