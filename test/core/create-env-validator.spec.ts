import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createEnvValidator, EnvValidationError } from '../../src/core/index.js'

describe('createEnvValidator', () => {
  it('returns parsed values and strips unknown keys from the input', () => {
    const schema = z.object({
      PORT: z.coerce.number().int(),
      EMAIL_ENABLED: z.stringbool(),
    })
    const validateEnv = createEnvValidator({ schema })

    const result = validateEnv({
      PORT: '4000',
      EMAIL_ENABLED: 'false',
      EXTRA_KEY: 'ignored',
    })

    expect(result).toEqual({
      PORT: 4000,
      EMAIL_ENABLED: false,
    })
    expect('EXTRA_KEY' in result).toBe(false)
  })

  it('throws EnvValidationError with a redaction-safe message when validation fails', () => {
    const secretValue = 'not-a-url-secret-password'
    const schema = z.object({
      DATABASE_URL: z.string().url(),
    })
    const validateEnv = createEnvValidator({
      schema,
      sensitiveKeys: ['DATABASE_URL'],
    })

    expect(() =>
      validateEnv({
        DATABASE_URL: secretValue,
      }),
    ).toThrow(EnvValidationError)

    try {
      validateEnv({
        DATABASE_URL: secretValue,
      })
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError)
      expect(error).toHaveProperty('issues')
      expect((error as EnvValidationError).issues).toEqual([
        expect.objectContaining({
          path: ['DATABASE_URL'],
          sensitive: true,
        }),
      ])
      expect((error as Error).message).toContain('Invalid environment variables')
      expect((error as Error).message).toContain('DATABASE_URL')
      expect((error as Error).message).not.toContain(secretValue)
    }
  })

  it('does not read or mutate process.env', () => {
    const originalPort = process.env.PORT

    try {
      process.env.PORT = '9999'
      const schema = z.object({
        PORT: z.coerce.number().int(),
      })
      const validateEnv = createEnvValidator({ schema })

      const result = validateEnv({ PORT: '3000' })

      expect(result.PORT).toBe(3000)
      expect(process.env.PORT).toBe('9999')
    } finally {
      if (originalPort === undefined) {
        delete process.env.PORT
      } else {
        process.env.PORT = originalPort
      }
    }
  })

  it('does not log by default', () => {
    const consoleLogSpy = vi.spyOn(console, 'log')
    const consoleErrorSpy = vi.spyOn(console, 'error')
    const schema = z.object({
      PORT: z.coerce.number().int(),
    })
    const validateEnv = createEnvValidator({ schema })

    validateEnv({ PORT: '3000' })

    expect(consoleLogSpy).not.toHaveBeenCalled()
    expect(consoleErrorSpy).not.toHaveBeenCalled()

    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })
})
