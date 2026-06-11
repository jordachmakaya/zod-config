# About

`@hardmachinelabs/zod-config` is built and maintained by **Jordach Makaya**.

I build TypeScript tools, NestJS systems, and AI-ready infrastructure with a focus on boring reliability: validation, explicit boundaries, safe defaults, and maintainable developer workflows.

This package exists because I kept solving the same problem across different projects.

Every time I started a new TypeScript or NestJS application, I eventually had to write another Zod-based configuration module: schema validation, typed access, safe error handling, NestJS integration, and test reset helpers. The implementation was never exactly the same, but the problem kept coming back.

`@hardmachinelabs/zod-config` is the reusable version of that pattern.

The goal is simple:

* Zod remains the source of truth.
* The core stays framework-independent.
* NestJS integration is isolated behind an adapter.
* Config access is typed and explicit.
* Errors stay redaction-safe.
* Global access exists only as a secondary explicit bridge.

This is not a secret manager, and it does not try to replace Zod or `@nestjs/config`.

It is a small TypeScript configuration utility for validating, typing, and reading already-provided environment-like objects safely.

## Related Work

### Env Sync

I also maintain **Env Sync**, an open-source CLI for reducing configuration drift between local `.env` files and CI/CD secrets.

Package:

```txt
@hardmachinelabs/env-sync
```

npm:

```txt
https://www.npmjs.com/package/@hardmachinelabs/env-sync
```

Env Sync is useful when projects have environment variables spread across:

* local `.env` files
* monorepo package-level `.env` files
* GitLab CI/CD variables
* GitHub Actions secrets
* workflow YAML files
* deployment environments

Where `@hardmachinelabs/zod-config` focuses on **runtime validation and typed config access**, Env Sync focuses on **keeping local and CI/CD configuration aligned**.

Together, they cover two different parts of the same configuration problem:

```txt
Env Sync                 -> keep CI/CD secrets aligned
@hardmachinelabs/zod-config  -> validate and read config safely at runtime
```

## Links

* Portfolio: https://jordach.dev
* Project page: https://jordach.dev/tools/zod-config
* LinkedIn: https://www.linkedin.com/in/jordachmakaya/
* Env Sync on npm: https://www.npmjs.com/package/@hardmachinelabs/env-sync
