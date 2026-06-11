import type { z } from 'zod'
import { EnvValidationError } from './errors.js'
import type { EnvKey, EnvRecord } from './types.js'

export type EnvValidatorOptions<TSchema extends z.ZodType> = {
  readonly schema: TSchema
  readonly sensitiveKeys?: readonly EnvKey<TSchema>[]
}

export function createEnvValidator<TSchema extends z.ZodType>(
  options: EnvValidatorOptions<TSchema>,
): (input: EnvRecord) => z.output<TSchema> {
  const sensitiveKeys = new Set<string>(options.sensitiveKeys ?? [])

  return (input: EnvRecord) => {
    const result = options.schema.safeParse(input)

    if (!result.success) {
      throw new EnvValidationError(
        result.error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path,
          sensitive: isSensitivePath(issue.path, sensitiveKeys),
        })),
      )
    }

    return result.data
  }
}

function isSensitivePath(
  path: readonly PropertyKey[],
  sensitiveKeys: ReadonlySet<string>,
): boolean {
  const [firstPathSegment] = path

  return typeof firstPathSegment === 'string'
    ? sensitiveKeys.has(firstPathSegment)
    : false
}
