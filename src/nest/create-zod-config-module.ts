import { Module, type DynamicModule, type Provider } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import type { z } from 'zod'
import {
  ConfigReader,
  createEnvValidator,
  type EnvKey,
  type EnvRecord,
} from '../core/index.js'
import { ZOD_CONFIG_READER } from './tokens.js'
import { ZodConfigService } from './zod-config.service.js'

export type ZodConfigModuleOptions<TSchema extends z.ZodType> = {
  readonly schema: TSchema
  readonly envFilePath?: string | string[]
  readonly ignoreEnvFile?: boolean
  readonly sensitiveKeys?: readonly EnvKey<TSchema>[]
  readonly freeze?: boolean
  readonly isGlobal?: boolean
}

@Module({})
class ZodConfigNestModule {}

export function createZodConfigModule<TSchema extends z.ZodType>(
  options: ZodConfigModuleOptions<TSchema>,
): DynamicModule {
  type Env = z.output<TSchema> & EnvRecord

  const isGlobal = options.isGlobal ?? true
  const validateEnv = createEnvValidator({
    schema: options.schema,
    ...(options.sensitiveKeys ? { sensitiveKeys: options.sensitiveKeys } : {}),
  })
  let validatedEnvFromConfigModule: Env | undefined

  const readerProvider: Provider<ConfigReader<Env>> = {
    provide: ZOD_CONFIG_READER,
    useFactory: () => {
      if (!validatedEnvFromConfigModule) {
        throw new Error('[ZodConfig] Config validation did not run.')
      }

      return new ConfigReader<Env>(
        validatedEnvFromConfigModule,
        options.freeze === undefined ? {} : { freeze: options.freeze },
      )
    },
  }

  const serviceProvider: Provider<ZodConfigService<Env>> = {
    provide: ZodConfigService,
    useFactory: (reader: ConfigReader<Env>) => new ZodConfigService<Env>(reader),
    inject: [ZOD_CONFIG_READER],
  }

  return {
    module: ZodConfigNestModule,
    global: isGlobal,
    imports: [
      ConfigModule.forRoot({
        isGlobal,
        ...(options.envFilePath === undefined
          ? {}
          : { envFilePath: options.envFilePath }),
        ...(options.ignoreEnvFile === undefined
          ? {}
          : { ignoreEnvFile: options.ignoreEnvFile }),
        validate: (config: Record<string, unknown>) => {
          // ConfigModule.forRoot() runs validate before this module's providers
          // are instantiated, so the reader receives exactly the parsed env once.
          validatedEnvFromConfigModule = validateEnv(config) as Env
          return validatedEnvFromConfigModule
        },
      }),
    ],
    providers: [readerProvider, serviceProvider],
    exports: [ZodConfigService],
  }
}
