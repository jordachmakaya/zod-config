import { ConfigReader, type EnvRecord } from '../core/index.js'

export class ZodConfigService<TEnv extends EnvRecord> {
  constructor(private readonly reader: ConfigReader<TEnv>) {}

  get<TKey extends keyof TEnv>(key: TKey): TEnv[TKey] {
    return this.reader.get(key)
  }
}
