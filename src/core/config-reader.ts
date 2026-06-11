import type { EnvRecord } from './types.js'

export type ConfigReaderOptions = {
  readonly freeze?: boolean
}

export class ConfigReaderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigReaderError'
  }
}

export class ConfigReader<TEnv extends EnvRecord> {
  private readonly values: TEnv

  constructor(values: TEnv, options: ConfigReaderOptions = {}) {
    this.values = options.freeze === false ? values : deepFreeze(values)
  }

  get<TKey extends keyof TEnv>(key: TKey): TEnv[TKey] {
    if (!Object.prototype.hasOwnProperty.call(this.values, key)) {
      throw new ConfigReaderError(`Missing config key: ${String(key)}`)
    }

    return this.values[key]
  }
}

function deepFreeze<TValue>(value: TValue, seen = new WeakSet<object>()): TValue {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return value
  }

  if (seen.has(value)) {
    return value
  }

  seen.add(value)

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key], seen)
  }

  return Object.freeze(value)
}
