import type { z } from 'zod'

export type EnvRecord = Record<string, unknown>

export type EnvKey<TSchema extends z.ZodType> = Extract<
  keyof z.output<TSchema>,
  string
>

export type EnvValidationIssue = {
  readonly code: string
  readonly path: readonly PropertyKey[]
  readonly sensitive: boolean
}
