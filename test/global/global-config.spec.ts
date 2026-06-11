import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ConfigReader } from '../../src/core/index.js'
import * as rootExports from '../../src/index.js'
import {
  getZodConfig,
  hasZodConfig,
  setZodConfig,
} from '../../src/global/index.js'
import * as globalExports from '../../src/global/index.js'
import { resetZodConfigForTests } from '../../src/testing/index.js'
import * as testingExports from '../../src/testing/index.js'

type Env = {
  PORT: number
  EMAIL_ENABLED: boolean
}

describe('global config bridge', () => {
  beforeEach(() => {
    resetZodConfigForTests()
  })

  it('reports missing config before initialization', () => {
    expect(hasZodConfig()).toBe(false)
    expect(() => getZodConfig<Env>()).toThrow(
      '[ZodConfig] Global config is not initialized.',
    )
  })

  it('stores and returns an explicit config reader', () => {
    const reader = new ConfigReader<Env>({
      PORT: 3000,
      EMAIL_ENABLED: true,
    })

    setZodConfig(reader)

    expect(hasZodConfig()).toBe(true)
    expect(getZodConfig<Env>()).toBe(reader)
    expect(getZodConfig<Env>().get('PORT')).toBe(3000)
    expect(getZodConfig<Env>().get('EMAIL_ENABLED')).toBe(true)
  })

  it('replaces the previous config reader when set again', () => {
    const readerA = new ConfigReader<Env>({
      PORT: 3000,
      EMAIL_ENABLED: false,
    })
    const readerB = new ConfigReader<Env>({
      PORT: 4000,
      EMAIL_ENABLED: true,
    })

    setZodConfig(readerA)
    setZodConfig(readerB)

    expect(getZodConfig<Env>()).toBe(readerB)
    expect(getZodConfig<Env>().get('PORT')).toBe(4000)
  })

  it('can reset the global config in tests', () => {
    setZodConfig(
      new ConfigReader<Env>({
        PORT: 3000,
        EMAIL_ENABLED: false,
      }),
    )

    resetZodConfigForTests()

    expect(hasZodConfig()).toBe(false)
  })

  it('does not log or read process.env', () => {
    const consoleLogSpy = vi.spyOn(console, 'log')
    const consoleErrorSpy = vi.spyOn(console, 'error')
    const originalPort = process.env.PORT

    try {
      process.env.PORT = '9999'
      setZodConfig(
        new ConfigReader<Env>({
          PORT: 3000,
          EMAIL_ENABLED: false,
        }),
      )

      expect(getZodConfig<Env>().get('PORT')).toBe(3000)
      expect(process.env.PORT).toBe('9999')
      expect(consoleLogSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    } finally {
      consoleLogSpy.mockRestore()
      consoleErrorSpy.mockRestore()

      if (originalPort === undefined) {
        delete process.env.PORT
      } else {
        process.env.PORT = originalPort
      }
    }
  })

  it('keeps global and testing APIs out of the root export surface', () => {
    expect(rootExports).not.toHaveProperty('getZodConfig')
    expect(rootExports).not.toHaveProperty('setZodConfig')
    expect(rootExports).not.toHaveProperty('hasZodConfig')
    expect(rootExports).not.toHaveProperty('resetZodConfigForTests')
  })

  it('exposes the global bridge only from src/global', () => {
    expect(globalExports).toHaveProperty('getZodConfig')
    expect(globalExports).toHaveProperty('setZodConfig')
    expect(globalExports).toHaveProperty('hasZodConfig')
    expect(globalExports).not.toHaveProperty('resetZodConfigForTests')
  })

  it('exposes the reset helper only from src/testing', () => {
    expect(testingExports).toHaveProperty('resetZodConfigForTests')
    expect(testingExports).not.toHaveProperty('getZodConfig')
    expect(testingExports).not.toHaveProperty('setZodConfig')
    expect(testingExports).not.toHaveProperty('hasZodConfig')
  })

  it('does not expose a Proxy-style env API', () => {
    const bridgeSource = readFileSync(
      join(process.cwd(), 'src', 'global', 'global-config.ts'),
      'utf8',
    )

    expect(bridgeSource).not.toContain('Proxy')
    expect(globalExports).not.toHaveProperty('env')
  })
})
