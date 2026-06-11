import type { ConfigReader, EnvRecord } from '../core/index.js'

let globalConfig: ConfigReader<EnvRecord> | undefined

export function setZodConfig<TEnv extends EnvRecord>(
  config: ConfigReader<TEnv>,
): void {
  globalConfig = config as ConfigReader<EnvRecord>
}

export function getZodConfig<TEnv extends EnvRecord>(): ConfigReader<TEnv> {
  if (!globalConfig) {
    throw new Error('[ZodConfig] Global config is not initialized.')
  }

  return globalConfig as ConfigReader<TEnv>
}

export function hasZodConfig(): boolean {
  return globalConfig !== undefined
}

export function resetGlobalZodConfigForTests(): void {
  globalConfig = undefined
}
