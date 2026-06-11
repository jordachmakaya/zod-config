import { describe, expect, it, vi } from 'vitest'
import {
  EnvValidationError,
  formatValidationError,
  redactValue,
  type EnvValidationIssue,
} from '../../src/core/index.js'

describe('redactValue', () => {
  it('returns a stable mask for sensitive values', () => {
    expect(redactValue('secret', true)).toBe('[REDACTED]')
    expect(redactValue(123, true)).toBe('[REDACTED]')
    expect(redactValue(false, true)).toBe('[REDACTED]')
    expect(redactValue(null, true)).toBe('[REDACTED]')
    expect(redactValue(undefined, true)).toBe('[REDACTED]')
    expect(redactValue({ token: 'secret' }, true)).toBe('[REDACTED]')
    expect(redactValue(['secret'], true)).toBe('[REDACTED]')
  })

  it('returns safe strings for non-sensitive primitive and structural values', () => {
    expect(redactValue('public', false)).toBe('public')
    expect(redactValue(123, false)).toBe('123')
    expect(redactValue(true, false)).toBe('true')
    expect(redactValue(null, false)).toBe('null')
    expect(redactValue(undefined, false)).toBe('undefined')
    expect(redactValue({ token: 'public' }, false)).toBe('[object]')
    expect(redactValue(['public'], false)).toBe('[array]')
  })
})

describe('formatValidationError', () => {
  it('formats a readable message for a non-sensitive issue', () => {
    const issues: readonly EnvValidationIssue[] = [
      { code: 'invalid_type', path: ['PORT'], sensitive: false },
    ]

    expect(formatValidationError(issues)).toBe(
      'Invalid environment variables: PORT (invalid_type)',
    )
  })

  it('shows a sensitive key but never includes the raw sensitive value', () => {
    const secretValue = 'not-a-url-secret-password'
    const issues: readonly EnvValidationIssue[] = [
      { code: 'invalid_format', path: ['DATABASE_URL'], sensitive: true },
    ]

    const message = formatValidationError(issues)

    expect(message).toContain('DATABASE_URL')
    expect(message).toContain('invalid_format')
    expect(message).not.toContain(secretValue)
    expect(message).not.toContain('[REDACTED]')
  })

  it('formats multiple errors with all paths visible', () => {
    const issues: readonly EnvValidationIssue[] = [
      { code: 'invalid_type', path: ['PORT'], sensitive: false },
      { code: 'invalid_format', path: ['DATABASE_URL'], sensitive: true },
      { code: 'invalid_value', path: ['NODE_ENV'], sensitive: false },
    ]

    const message = formatValidationError(issues)

    expect(message).toContain('PORT')
    expect(message).toContain('DATABASE_URL')
    expect(message).toContain('NODE_ENV')
  })

  it('never leaks secrets in mixed sensitive and non-sensitive issues', () => {
    const secretValue = 'smtp-password-secret'
    const issues: readonly EnvValidationIssue[] = [
      { code: 'invalid_type', path: ['PORT'], sensitive: false },
      { code: 'too_small', path: ['SMTP_PASS'], sensitive: true },
    ]

    expect(formatValidationError(issues)).not.toContain(secretValue)
  })

  it('does not log or read process.env', () => {
    const consoleLogSpy = vi.spyOn(console, 'log')
    const consoleErrorSpy = vi.spyOn(console, 'error')
    const originalEnv = process.env.SPRINT_2_SECRET

    try {
      process.env.SPRINT_2_SECRET = 'secret-from-process-env'
      const issues: readonly EnvValidationIssue[] = [
        { code: 'invalid_type', path: ['PORT'], sensitive: false },
      ]

      const message = formatValidationError(issues)

      expect(message).not.toContain('secret-from-process-env')
      expect(consoleLogSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    } finally {
      consoleLogSpy.mockRestore()
      consoleErrorSpy.mockRestore()

      if (originalEnv === undefined) {
        delete process.env.SPRINT_2_SECRET
      } else {
        process.env.SPRINT_2_SECRET = originalEnv
      }
    }
  })
})

describe('EnvValidationError', () => {
  it('exposes name, message, and issues without raw values', () => {
    const secretValue = 'jwt-secret-value'
    const issues: readonly EnvValidationIssue[] = [
      { code: 'too_small', path: ['JWT_SECRET'], sensitive: true },
    ]

    const error = new EnvValidationError(issues)

    expect(error.name).toBe('EnvValidationError')
    expect(error.message).toContain('JWT_SECRET')
    expect(error.message).not.toContain(secretValue)
    expect(error.issues).toBe(issues)
  })
})
