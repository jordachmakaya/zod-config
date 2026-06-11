import { expectError, expectType } from 'tsd'
import * as root from '../src/index.js'
import * as global from '../src/global/index.js'
import * as testing from '../src/testing/index.js'

expectType<typeof root.ConfigReader>(root.ConfigReader)
expectType<typeof root.ConfigReaderError>(root.ConfigReaderError)
expectType<typeof root.createEnvValidator>(root.createEnvValidator)
expectType<typeof root.EnvValidationError>(root.EnvValidationError)
expectType<typeof root.formatValidationError>(root.formatValidationError)
expectType<typeof root.redactValue>(root.redactValue)
expectType<typeof root.REDACTED_VALUE>(root.REDACTED_VALUE)

expectError(root.getZodConfig)
expectError(root.setZodConfig)
expectError(root.hasZodConfig)
expectError(root.resetZodConfigForTests)

expectType<typeof global.getZodConfig>(global.getZodConfig)
expectType<typeof global.setZodConfig>(global.setZodConfig)
expectType<typeof global.hasZodConfig>(global.hasZodConfig)
expectError(global.resetZodConfigForTests)

expectType<typeof testing.resetZodConfigForTests>(
  testing.resetZodConfigForTests,
)
expectError(testing.getZodConfig)
expectError(testing.setZodConfig)
expectError(testing.hasZodConfig)
