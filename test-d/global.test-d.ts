import { expectError, expectType } from 'tsd'
import { ConfigReader } from '../src/core/index.js'
import {
  getZodConfig,
  hasZodConfig,
  setZodConfig,
} from '../src/global/index.js'
import { resetZodConfigForTests } from '../src/testing/index.js'

type Env = {
  PORT: number
  EMAIL_ENABLED: boolean
}

const reader = new ConfigReader<Env>({
  PORT: 3000,
  EMAIL_ENABLED: true,
})

setZodConfig(reader)
expectType<boolean>(hasZodConfig())
expectType<ConfigReader<Env>>(getZodConfig<Env>())
expectType<number>(getZodConfig<Env>().get('PORT'))
expectType<boolean>(getZodConfig<Env>().get('EMAIL_ENABLED'))
expectError(getZodConfig<Env>().get('UNKNOWN_KEY'))
expectType<void>(resetZodConfigForTests())
