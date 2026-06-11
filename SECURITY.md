# Security Policy

## Supported versions

Until `1.0.0`, only the current latest release is supported for security fixes.
Older pre-1.0 versions may not receive patches.

## Reporting vulnerabilities

Do not open a public issue for security vulnerabilities, leaked secrets, or bugs
that could expose sensitive configuration values.

Please contact the maintainer through the repository security advisory flow when
available.

When reporting, include:

- A short description of the vulnerability.
- A minimal reproduction if possible.
- Affected versions.
- Whether secrets or sensitive values can be exposed.
- Any known workaround.

## Handling secrets

Never include real secrets in reports, tests, logs, stack traces, screenshots,
or reproduction repositories. Replace them with clearly fake values.
