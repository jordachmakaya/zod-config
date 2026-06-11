import 'reflect-metadata'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Test } from '@nestjs/testing'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { EnvValidationError } from '../../src/core/index.js'
import {
  createZodConfigModule,
  ZodConfigService,
} from '../../src/nest/index.js'

const schema = z.object({
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  EMAIL_ENABLED: z.stringbool().default(false),
  FEATURE_FLAGS: z
    .object({
      beta: z.boolean(),
    })
    .default({ beta: true }),
})

type Env = z.output<typeof schema>

describe('createZodConfigModule', () => {
  it('compiles a Nest module and injects ZodConfigService', async () => {
    await withEnv(
      {
        PORT: '4000',
        DATABASE_URL: 'postgres://example',
        EMAIL_ENABLED: 'true',
      },
      async () => {
        const moduleRef = await Test.createTestingModule({
          imports: [
            createZodConfigModule({
              schema,
              ignoreEnvFile: true,
              sensitiveKeys: ['DATABASE_URL'],
            }),
          ],
        }).compile()

        const service = moduleRef.get<ZodConfigService<Env>>(ZodConfigService)

        expect(service).toBeInstanceOf(ZodConfigService)
        expect(service.get('PORT')).toBe(4000)
        expect(typeof service.get('PORT')).toBe('number')
        expect(service.get('EMAIL_ENABLED')).toBe(true)
        expect(typeof service.get('EMAIL_ENABLED')).toBe('boolean')

        await moduleRef.close()
      },
    )
  })

  it('marks the dynamic module global by default', () => {
    const moduleDefinition = createZodConfigModule({
      schema: z.object({
        PORT: z.coerce.number().int().default(3000),
      }),
      ignoreEnvFile: true,
    })

    expect(moduleDefinition.global).toBe(true)
  })

  it('supports isGlobal: false as a local module', async () => {
    const localSchema = z.object({
      PORT: z.coerce.number().int().default(3000),
    })
    type LocalEnv = z.output<typeof localSchema>
    const moduleDefinition = createZodConfigModule({
      schema: localSchema,
      ignoreEnvFile: true,
      isGlobal: false,
    })

    expect(moduleDefinition.global).toBe(false)

    await withEnv(
      {
        DATABASE_URL: 'postgres://example',
      },
      async () => {
        const moduleRef = await Test.createTestingModule({
          imports: [moduleDefinition],
        }).compile()
        const service =
          moduleRef.get<ZodConfigService<LocalEnv>>(ZodConfigService)

        expect(service.get('PORT')).toBe(3000)

        await moduleRef.close()
      },
    )
  })

  it('throws EnvValidationError when the environment is invalid and marks sensitive issues', async () => {
    await withEnv(
      {
        DATABASE_URL: '',
        EMAIL_ENABLED: 'false',
      },
      async () => {
        await expect(async () =>
          Test.createTestingModule({
            imports: [
              createZodConfigModule({
                schema,
                ignoreEnvFile: true,
                sensitiveKeys: ['DATABASE_URL'],
              }),
            ],
          }).compile(),
        ).rejects.toThrow(EnvValidationError)

        try {
          await Test.createTestingModule({
            imports: [
              createZodConfigModule({
                schema,
                ignoreEnvFile: true,
                sensitiveKeys: ['DATABASE_URL'],
              }),
            ],
          }).compile()
        } catch (error) {
          expect(error).toBeInstanceOf(EnvValidationError)
          expect((error as EnvValidationError).issues).toEqual([
            expect.objectContaining({
              path: ['DATABASE_URL'],
              sensitive: true,
            }),
          ])
        }
      },
    )
  })

  it('passes freeze: true to ConfigReader and makes config immutable', async () => {
    await withEnv(
      {
        DATABASE_URL: 'postgres://example',
      },
      async () => {
        const moduleRef = await Test.createTestingModule({
          imports: [
            createZodConfigModule({
              schema,
              ignoreEnvFile: true,
              freeze: true,
            }),
          ],
        }).compile()
        const service = moduleRef.get<ZodConfigService<Env>>(ZodConfigService)

        expect(Object.isFrozen(service.get('FEATURE_FLAGS'))).toBe(true)
        expect(() => {
          service.get('FEATURE_FLAGS').beta = false
        }).toThrow(TypeError)

        await moduleRef.close()
      },
    )
  })

  it('passes freeze: false to ConfigReader and allows opt-out', async () => {
    await withEnv(
      {
        DATABASE_URL: 'postgres://example',
      },
      async () => {
        const moduleRef = await Test.createTestingModule({
          imports: [
            createZodConfigModule({
              schema,
              ignoreEnvFile: true,
              freeze: false,
            }),
          ],
        }).compile()
        const service = moduleRef.get<ZodConfigService<Env>>(ZodConfigService)

        service.get('FEATURE_FLAGS').beta = false

        expect(service.get('FEATURE_FLAGS').beta).toBe(false)
        expect(Object.isFrozen(service.get('FEATURE_FLAGS'))).toBe(false)

        await moduleRef.close()
      },
    )
  })

  it('runs ConfigModule validate before creating ConfigReader and does not parse twice', async () => {
    let parseCount = 0
    const transformSchema = z.object({
      DATABASE_URL: z.string().min(1),
      NORMALIZED_NAME: z.string().transform((value) => {
        parseCount += 1
        return value.trim().toUpperCase()
      }),
    })
    type TransformEnv = z.output<typeof transformSchema>

    await withEnv(
      {
        DATABASE_URL: 'postgres://example',
        NORMALIZED_NAME: ' demo ',
      },
      async () => {
        const moduleRef = await Test.createTestingModule({
          imports: [
            createZodConfigModule({
              schema: transformSchema,
              ignoreEnvFile: true,
            }),
          ],
        }).compile()
        const service =
          moduleRef.get<ZodConfigService<TransformEnv>>(ZodConfigService)

        expect(service.get('NORMALIZED_NAME')).toBe('DEMO')
        expect(parseCount).toBe(1)

        await moduleRef.close()
      },
    )
  })

  it('serves transformed Zod output and strips unknown process.env noise', async () => {
    const transformSchema = z.object({
      PORT: z.coerce.number().int().default(3000),
      EMAIL_ENABLED: z.stringbool().default(false),
      NORMALIZED_NAME: z.string().transform((value) => value.trim().toUpperCase()),
      FEATURE_FLAGS: z
        .object({
          beta: z.boolean().default(true),
        })
        .default({ beta: true }),
      ALLOWED_ORIGINS: z
        .string()
        .default('https://app.example.com, https://admin.example.com')
        .transform((value) =>
          value
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
        ),
    })
    type TransformEnv = z.output<typeof transformSchema>

    await withEnv(
      {
        PORT: '4100',
        EMAIL_ENABLED: 'no',
        NORMALIZED_NAME: ' demo ',
        EXTRA_SECRET: 'should-not-be-readable',
      },
      async () => {
        const moduleRef = await Test.createTestingModule({
          imports: [
            createZodConfigModule({
              schema: transformSchema,
              ignoreEnvFile: true,
            }),
          ],
        }).compile()
        const service =
          moduleRef.get<ZodConfigService<TransformEnv>>(ZodConfigService)

        expect(service.get('PORT')).toBe(4100)
        expect(service.get('EMAIL_ENABLED')).toBe(false)
        expect(service.get('NORMALIZED_NAME')).toBe('DEMO')
        expect(service.get('FEATURE_FLAGS')).toEqual({ beta: true })
        expect(service.get('ALLOWED_ORIGINS')).toEqual([
          'https://app.example.com',
          'https://admin.example.com',
        ])
        expect(() =>
          service.get('EXTRA_SECRET' as keyof TransformEnv),
        ).toThrow('Missing config key: EXTRA_SECRET')

        await moduleRef.close()
      },
    )
  })

  it('does not log by default', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log')
    const consoleErrorSpy = vi.spyOn(console, 'error')

    try {
      await withEnv(
        {
          DATABASE_URL: 'postgres://example',
        },
        async () => {
          const moduleRef = await Test.createTestingModule({
            imports: [
              createZodConfigModule({
                schema,
                ignoreEnvFile: true,
              }),
            ],
          }).compile()
          const service = moduleRef.get<ZodConfigService<Env>>(ZodConfigService)

          service.get('PORT')

          expect(consoleLogSpy).not.toHaveBeenCalled()
          expect(consoleErrorSpy).not.toHaveBeenCalled()

          await moduleRef.close()
        },
      )
    } finally {
      consoleLogSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    }
  })

  it('does not depend on the global bridge from src/nest', () => {
    const nestDir = join(process.cwd(), 'src', 'nest')
    const nestSources = readdirSync(nestDir)
      .filter((fileName) => fileName.endsWith('.ts'))
      .map((fileName) => readFileSync(join(nestDir, fileName), 'utf8'))
      .join('\n')

    expect(nestSources).not.toContain('setZodConfig')
    expect(nestSources).not.toContain('getZodConfig')
    expect(nestSources).not.toContain('hasZodConfig')
    expect(nestSources).not.toContain('resetZodConfigForTests')
    expect(nestSources).not.toContain('Proxy')
  })

  it('does not import NestJS from src/core', () => {
    const coreDir = join(process.cwd(), 'src', 'core')
    const coreSources = readdirSync(coreDir)
      .filter((fileName) => fileName.endsWith('.ts'))
      .map((fileName) => readFileSync(join(coreDir, fileName), 'utf8'))
      .join('\n')

    expect(coreSources).not.toContain('@nestjs/')
  })
})

async function withEnv(
  values: Record<string, string | undefined>,
  callback: () => Promise<void>,
): Promise<void> {
  const previousValues = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(values)) {
    previousValues.set(key, process.env[key])

    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    await callback()
  } finally {
    for (const [key, value] of previousValues) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}
