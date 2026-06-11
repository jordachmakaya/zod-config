# Security

The library is designed to avoid accidental secret exposure in validation
errors.

- Mark sensitive schema keys with `sensitiveKeys`.
- `EnvValidationError.message` does not include raw sensitive values.
- `EnvValidationIssue` does not store raw input values.
- `formatValidationError()` formats issue paths and Zod codes only.
- `redactValue()` masks sensitive values and avoids dumping objects or arrays.
- The library does not log automatically.

Example:

```ts
const validateEnv = createEnvValidator({
  schema,
  sensitiveKeys: ['DATABASE_URL', 'JWT_SECRET'],
})
```

Do not put real secrets in tests, fixtures, examples, issue reports, or logs.
