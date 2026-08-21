# Architecture

## Independent skills, compatible workflow

The repository is a maintenance monorepo, not a single coupled skill.

### analizar-carrusel-referencia

Inspects a public carousel and separates observed copy, visual description,
translation, interpretation, and performance hypotheses. It can answer in the
conversation without writing files. Corpus persistence is an explicitly
authorized optional mode.

### carousel-builder

Consumes an idea, article, approved script, or textual reference record. It
combines narrative craft with a client-owned editorial POV and visual system,
then produces publishable assets through a local or Canva path.

## Boundary

- A public link authorizes inspection, not persistence.
- A reference record teaches mechanisms, not phrases or identity.
- The builder owns rendering mechanics, not client brand decisions.
- Local rendering is deterministic and blocks failed QA.
- Canva operations follow the connector's current permissions and never use
  anonymous public hosting for private assets.

## Contract ownership

- `record-schema.md` belongs to `analizar-carrusel-referencia`.
- `slides.json` and `carousel.config.json` belong to `carousel-builder`.
- No schema is duplicated between skills; each remains installable by retaining
  the runtime resources it actually needs.
