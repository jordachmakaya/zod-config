# Limitations

- This package does not load `.env` files in the core package. Use your runtime,
  framework, or `@nestjs/config` for loading.
- The core does not read or mutate `process.env`; callers pass an input object.
- Unknown-key behavior is controlled by the Zod schema. A standard `z.object`
  strips unknown keys.
- `ConfigReader` deep-freezes the object it receives by default. This is useful
  for configuration, but callers should not pass objects they intend to mutate.
- The global bridge supports a single explicit config instance. It does not
  support named configs or a proxy API.
- The Nest adapter is single-config for now.
