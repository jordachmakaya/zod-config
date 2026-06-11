import { describe, expect, it, vi } from 'vitest'
import { ConfigReader, ConfigReaderError } from '../../src/core/index.js'

type TestEnv = {
  PORT: number
  EMAIL_ENABLED: boolean
  API_URL: string
  FEATURE_FLAGS: {
    beta: boolean
    nested: {
      enabled: boolean
    }
  }
  ALLOWED_ORIGINS: string[]
  OPTIONAL_VALUE: null
}

describe('ConfigReader', () => {
  it('returns values from the validated config object', () => {
    const reader = new ConfigReader<TestEnv>({
      PORT: 3000,
      EMAIL_ENABLED: false,
      API_URL: 'https://example.com',
      FEATURE_FLAGS: {
        beta: true,
        nested: {
          enabled: false,
        },
      },
      ALLOWED_ORIGINS: ['https://app.example.com'],
      OPTIONAL_VALUE: null,
    })

    expect(reader.get('PORT')).toBe(3000)
    expect(reader.get('EMAIL_ENABLED')).toBe(false)
    expect(reader.get('API_URL')).toBe('https://example.com')
  })

  it('throws a clear error when a typed key is missing at runtime', () => {
    const reader = new ConfigReader<TestEnv>({
      PORT: 3000,
    } as TestEnv)

    expect(() => reader.get('EMAIL_ENABLED')).toThrow(ConfigReaderError)
    expect(() => reader.get('EMAIL_ENABLED')).toThrow(
      'Missing config key: EMAIL_ENABLED',
    )
  })

  it('does not read or mutate process.env', () => {
    const originalPort = process.env.PORT

    try {
      process.env.PORT = '9999'
      const reader = new ConfigReader<Pick<TestEnv, 'PORT'>>({
        PORT: 3000,
      })

      expect(reader.get('PORT')).toBe(3000)
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
    const reader = new ConfigReader<Pick<TestEnv, 'PORT'>>({
      PORT: 3000,
    })

    reader.get('PORT')

    expect(consoleLogSpy).not.toHaveBeenCalled()
    expect(consoleErrorSpy).not.toHaveBeenCalled()

    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('deep-freezes primitives, objects, arrays, nested objects, and null by default', () => {
    const reader = new ConfigReader<TestEnv>({
      PORT: 3000,
      EMAIL_ENABLED: true,
      API_URL: 'https://example.com',
      FEATURE_FLAGS: {
        beta: true,
        nested: {
          enabled: true,
        },
      },
      ALLOWED_ORIGINS: ['https://app.example.com'],
      OPTIONAL_VALUE: null,
    })

    expect(Object.isFrozen(reader.get('PORT'))).toBe(true)
    expect(Object.isFrozen(reader.get('FEATURE_FLAGS'))).toBe(true)
    expect(Object.isFrozen(reader.get('ALLOWED_ORIGINS'))).toBe(true)
    expect(Object.isFrozen(reader.get('FEATURE_FLAGS').nested)).toBe(true)
    expect(Object.isFrozen(reader.get('OPTIONAL_VALUE'))).toBe(true)
    expect(() => {
      reader.get('FEATURE_FLAGS').nested.enabled = false
    }).toThrow(TypeError)
    expect(() => {
      reader.get('ALLOWED_ORIGINS').push('https://admin.example.com')
    }).toThrow(TypeError)
  })

  it('supports cyclic config objects while freezing each object once', () => {
    type CyclicEnv = {
      NODE: {
        name: string
        self?: CyclicEnv['NODE']
      }
    }
    const node: CyclicEnv['NODE'] = { name: 'root' }
    node.self = node
    const reader = new ConfigReader<CyclicEnv>({ NODE: node })

    expect(reader.get('NODE').self).toBe(reader.get('NODE'))
    expect(Object.isFrozen(reader.get('NODE'))).toBe(true)
  })

  it('freezes the received object in place by default', () => {
    const values = {
      FEATURE_FLAGS: {
        beta: true,
        nested: {
          enabled: true,
        },
      },
    }

    const reader = new ConfigReader<Pick<TestEnv, 'FEATURE_FLAGS'>>(values)

    expect(reader.get('FEATURE_FLAGS')).toBe(values.FEATURE_FLAGS)
    expect(Object.isFrozen(values)).toBe(true)
    expect(Object.isFrozen(values.FEATURE_FLAGS)).toBe(true)
    expect(Object.isFrozen(values.FEATURE_FLAGS.nested)).toBe(true)
  })

  it('can opt out of freezing explicitly', () => {
    const reader = new ConfigReader<Pick<TestEnv, 'FEATURE_FLAGS'>>(
      {
        FEATURE_FLAGS: {
          beta: true,
          nested: {
            enabled: true,
          },
        },
      },
      { freeze: false },
    )

    reader.get('FEATURE_FLAGS').nested.enabled = false

    expect(reader.get('FEATURE_FLAGS').nested.enabled).toBe(false)
    expect(Object.isFrozen(reader.get('FEATURE_FLAGS'))).toBe(false)
  })
})
