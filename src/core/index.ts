import type { z } from 'zod'

export {
  ConfigReader,
  ConfigReaderError,
} from './config-reader.js'
export { createEnvValidator } from './create-env-validator.js'
export { EnvValidationError, formatValidationError } from './errors.js'
export { REDACTED_VALUE, redactValue } from './redaction.js'
export type { ConfigReaderOptions } from './config-reader.js'
export type { EnvValidatorOptions } from './create-env-validator.js'
export type { EnvKey, EnvRecord, EnvValidationIssue } from './types.js'

export type InferEnv<TSchema extends z.ZodType> = z.output<TSchema>
