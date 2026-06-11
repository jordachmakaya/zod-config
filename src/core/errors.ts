import type { EnvValidationIssue } from './types.js'

export class EnvValidationError extends Error {
  readonly issues: readonly EnvValidationIssue[]

  constructor(issues: readonly EnvValidationIssue[]) {
    super(formatValidationError(issues))
    this.name = 'EnvValidationError'
    this.issues = issues
  }
}

export function formatValidationError(
  issues: readonly EnvValidationIssue[],
): string {
  const details = issues.map(formatIssue)
  const suffix = details.length > 0 ? `: ${details.join('; ')}` : ''

  return `Invalid environment variables${suffix}`
}

function formatIssue(issue: EnvValidationIssue): string {
  return `${formatPath(issue.path)} (${issue.code})`
}

function formatPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return '<root>'
  }

  return path.map((part) => String(part)).join('.')
}
