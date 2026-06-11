export const REDACTED_VALUE = '[REDACTED]'

export function redactValue(value: unknown, sensitive: boolean): string {
  if (sensitive) {
    return REDACTED_VALUE
  }

  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'undefined'
  }

  if (Array.isArray(value)) {
    return '[array]'
  }

  if (typeof value === 'object') {
    return '[object]'
  }

  return String(value)
}
