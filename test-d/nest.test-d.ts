import type { DynamicModule } from '@nestjs/common'
import { expectAssignable, expectError, expectType } from 'tsd'
import { z } from 'zod'
import type { InferEnv } from '../src/core/index.js'
import {
  createZodConfigModule,
  ZodConfigService,
} from '../src/nest/index.js'

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  EMAIL_ENABLED: z.stringbool().default(false),
})

type Env = InferEnv<typeof schema>

expectAssignable<DynamicModule>(
  createZodConfigModule({
    schema,
    sensitiveKeys: ['DATABASE_URL'],
  }),
)

expectError(
  createZodConfigModule({
    schema,
    sensitiveKeys: ['UNKNOWN_KEY'],
  }),
)

declare const service: ZodConfigService<Env>

expectType<number>(service.get('PORT'))
expectType<boolean>(service.get('EMAIL_ENABLED'))
expectError(service.get('UNKNOWN_KEY'))
