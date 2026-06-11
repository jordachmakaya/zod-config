import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  ConfigReader,
  createEnvValidator,
  EnvValidationError,
  formatValidationError,
  redactValue,
} from '../../src/core/index.js'
import * as coreExports from '../../src/core/index.js'
import * as globalExports from '../../src/global/index.js'
import * as nestExports from '../../src/nest/index.js'
import * as rootExports from '../../src/index.js'
import * as testingExports from '../../src/testing/index.js'

const secretValues = [
  'postgres://user:password@host/db',
  'super-secret-token',
  'smtp-secret',
] as const

describe('REDTEAM secrets and redaction', () => {
  it('never leaks invalid sensitive values through error messages, formatted errors, or issues', () => {
    const schema = z.object({
      DATABASE_URL: z.string().startsWith('mysql://'),
      JWT_SECRET: z.string().min(100),
      SMTP_PASS: z.string().regex(/^never-match$/),
    })
    const validateEnv = createEnvValidator({
      schema,
      sensitiveKeys: ['DATABASE_URL', 'JWT_SECRET', 'SMTP_PASS'],
    })

    try {
      validateEnv({
        DATABASE_URL: secretValues[0],
        JWT_SECRET: secretValues[1],
        SMTP_PASS: secretValues[2],
      })
      throw new Error('Expected validation to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError)

      const envError = error as EnvValidationError
      const formatted = formatValidationError(envError.issues)
      const serializedIssues = JSON.stringify(envError.issues)

      expect(envError.message).toContain('DATABASE_URL')
      expect(envError.message).toContain('JWT_SECRET')
      expect(envError.message).toContain('SMTP_PASS')
      expect(formatted).toContain('DATABASE_URL')
      expect(formatted).toContain('JWT_SECRET')
      expect(formatted).toContain('SMTP_PASS')
      expect(envError.issues).toHaveLength(3)
      expect(envError.issues.every((issue) => issue.sensitive)).toBe(true)

      for (const secretValue of secretValues) {
        expect(envError.message).not.toContain(secretValue)
        expect(formatted).not.toContain(secretValue)
        expect(serializedIssues).not.toContain(secretValue)
      }

      for (const issue of envError.issues) {
        expect(issue).not.toHaveProperty('rawValue')
        expect(issue).not.toHaveProperty('receivedValue')
        expect(issue).not.toHaveProperty('input')
        expect(issue).not.toHaveProperty('actual')
      }
    }
  })

  it('does not dump objects or arrays through redactValue', () => {
    expect(redactValue({ token: secretValues[1] }, false)).toBe('[object]')
    expect(redactValue([secretValues[2]], false)).toBe('[array]')
    expect(redactValue({ token: secretValues[1] }, true)).toBe('[REDACTED]')
    expect(redactValue([secretValues[2]], true)).toBe('[REDACTED]')
  })

  it('does not keep REDTEAM secrets in snapshot files', () => {
    const snapshots = findFiles(process.cwd(), (filePath) =>
      filePath.endsWith('.snap'),
    )

    for (const snapshotPath of snapshots) {
      const snapshot = readFileSync(snapshotPath, 'utf8')

      for (const secretValue of secretValues) {
        expect(snapshot).not.toContain(secretValue)
      }
    }
  })
})

describe('REDTEAM boolean env parsing', () => {
  it.each([
    ['true', true],
    ['false', false],
    ['1', true],
    ['0', false],
    ['yes', true],
    ['no', false],
  ] as const)('parses %s with z.stringbool()', (rawValue, expected) => {
    const validateEnv = createEnvValidator({
      schema: z.object({
        EMAIL_ENABLED: z.stringbool(),
      }),
    })

    expect(validateEnv({ EMAIL_ENABLED: rawValue })).toEqual({
      EMAIL_ENABLED: expected,
    })
  })

  it('does not treat the string "false" like Boolean("false")', () => {
    const validateEnv = createEnvValidator({
      schema: z.object({
        EMAIL_ENABLED: z.stringbool(),
      }),
    })

    expect(Boolean('false')).toBe(true)
    expect(validateEnv({ EMAIL_ENABLED: 'false' }).EMAIL_ENABLED).toBe(false)
  })
})

describe('REDTEAM unknown keys and transform pipeline', () => {
  it('strips process.env noise and returns only schema-declared keys', () => {
    const validateEnv = createEnvValidator({
      schema: z.object({
        PORT: z.coerce.number().int(),
        EMAIL_ENABLED: z.stringbool(),
      }),
    })

    const result = validateEnv({
      PORT: '4000',
      EMAIL_ENABLED: 'yes',
      PATH: 'C:/Windows/System32',
      HOME: 'C:/Users/example',
      npm_config_registry: 'https://registry.npmjs.org',
      EXTRA_SECRET: secretValues[1],
    })

    expect(result).toEqual({
      PORT: 4000,
      EMAIL_ENABLED: true,
    })
    expect(result).not.toHaveProperty('PATH')
    expect(result).not.toHaveProperty('HOME')
    expect(result).not.toHaveProperty('npm_config_registry')
    expect(result).not.toHaveProperty('EXTRA_SECRET')
  })

  it('preserves defaults, coercion, stringbool, transforms, nested defaults, and array transforms', () => {
    const validateEnv = createEnvValidator({
      schema: z.object({
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
      }),
    })

    expect(
      validateEnv({
        NORMALIZED_NAME: ' demo ',
      }),
    ).toEqual({
      PORT: 3000,
      EMAIL_ENABLED: false,
      NORMALIZED_NAME: 'DEMO',
      FEATURE_FLAGS: {
        beta: true,
      },
      ALLOWED_ORIGINS: [
        'https://app.example.com',
        'https://admin.example.com',
      ],
    })
  })

  it('ConfigReader reads only the object it receives', () => {
    const reader = new ConfigReader<{ PORT: number }>({ PORT: 3000 })

    expect(reader.get('PORT')).toBe(3000)
    expect(() =>
      reader.get('EXTRA_SECRET' as keyof { PORT: number }),
    ).toThrow('Missing config key: EXTRA_SECRET')
  })
})

describe('REDTEAM package export surface', () => {
  it('keeps public subpaths explicit and root core-only', () => {
    expect(rootExports).toHaveProperty('ConfigReader')
    expect(rootExports).toHaveProperty('createEnvValidator')
    expect(rootExports).not.toHaveProperty('getZodConfig')
    expect(rootExports).not.toHaveProperty('setZodConfig')
    expect(rootExports).not.toHaveProperty('hasZodConfig')
    expect(rootExports).not.toHaveProperty('resetZodConfigForTests')

    expect(coreExports).toHaveProperty('ConfigReader')
    expect(coreExports).toHaveProperty('createEnvValidator')
    expect(nestExports).toHaveProperty('createZodConfigModule')
    expect(nestExports).toHaveProperty('ZodConfigService')
    expect(globalExports).toHaveProperty('getZodConfig')
    expect(globalExports).toHaveProperty('setZodConfig')
    expect(globalExports).toHaveProperty('hasZodConfig')
    expect(testingExports).toHaveProperty('resetZodConfigForTests')
  })

  it('does not import NestJS from root, core, global, or testing sources', () => {
    for (const sourcePath of [
      join(process.cwd(), 'src', 'index.ts'),
      ...findFiles(join(process.cwd(), 'src', 'core'), (filePath) =>
        filePath.endsWith('.ts'),
      ),
      ...findFiles(join(process.cwd(), 'src', 'global'), (filePath) =>
        filePath.endsWith('.ts'),
      ),
      ...findFiles(join(process.cwd(), 'src', 'testing'), (filePath) =>
        filePath.endsWith('.ts'),
      ),
    ]) {
      expect(readFileSync(sourcePath, 'utf8')).not.toContain('@nestjs/')
    }
  })

  it('keeps package subpath exports wired', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      exports: Record<string, unknown>
    }

    expect(Object.keys(packageJson.exports).sort()).toEqual([
      '.',
      './core',
      './global',
      './nest',
      './testing',
    ])
  })
})

function findFiles(
  startPath: string,
  predicate: (filePath: string) => boolean,
): string[] {
  const result: string[] = []

  for (const entry of readdirSync(startPath)) {
    const entryPath = join(startPath, entry)
    const stat = statSync(entryPath)

    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') {
        continue
      }

      result.push(...findFiles(entryPath, predicate))
      continue
    }

    if (predicate(entryPath)) {
      result.push(entryPath)
    }
  }

  return result
}
