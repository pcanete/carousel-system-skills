# Versioning and Compatibility

Each skill follows semantic versioning independently.

| Skill | Current version | Contract |
| --- | ---: | --- |
| analizar-carrusel-referencia | 0.1.0 | textual record 0.1.x |
| carousel-builder | 0.1.0 | carousel config and slides 0.1.x |

## Rules

- Patch: documentation, security, QA, or behavior fixes without contract changes.
- Minor: backward-compatible capabilities or optional fields.
- Major: incompatible schema, required-input, permission, or output changes.

Repository releases describe the included version of both skills. Suggested
skill-specific tags:

- `analizar-carrusel-referencia-v0.1.0`
- `carousel-builder-v0.1.0`
