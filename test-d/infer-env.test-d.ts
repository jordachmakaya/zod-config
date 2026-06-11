import { expectError, expectType } from 'tsd'
import { z } from 'zod'
import {
  ConfigReader,
  createEnvValidator,
  type EnvRecord,
  type InferEnv,
} from '../src/core/index.js'

const schema = z.object({
  PORT: z.coerce.number().int(),
  EMAIL_ENABLED: z.stringbool(),
})

type Env = InferEnv<typeof schema>

declare const env: Env

expectType<number>(env.PORT)
expectType<boolean>(env.EMAIL_ENABLED)

const validateEnv = createEnvValidator({
  schema,
  sensitiveKeys: ['PORT'],
})

expectType<(input: EnvRecord) => Env>(validateEnv)
expectType<Env>(
  validateEnv({
    PORT: '3000',
    EMAIL_ENABLED: 'true',
  }),
)

expectError(
  createEnvValidator({
    schema,
    sensitiveKeys: ['UNKNOWN_KEY'],
  }),
)

const reader = new ConfigReader<Env>({
  PORT: 3000,
  EMAIL_ENABLED: false,
})

expectType<number>(reader.get('PORT'))
expectType<boolean>(reader.get('EMAIL_ENABLED'))
expectError(reader.get('UNKNOWN_KEY'))
expectError(
  new ConfigReader<Env>({
    PORT: 3000,
    EMAIL_ENABLED: false,
    UNKNOWN_KEY: 'nope',
  }),
)
