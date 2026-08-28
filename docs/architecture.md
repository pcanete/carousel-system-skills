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

## Verificación

El repositorio ejecuta lo que publica, no solo lo revisa.

`build.mjs` corre contra fixtures reales: se comprueba que un título con HTML
salga escapado y con CSP, que un `kind` desconocido falle el build y que los
artefactos sobrantes se limpien. `render.ps1` se parsea con PowerShell en un
job aparte. El extractor de Instagram tiene pruebas propias que cubren qué
enlaces acepta y que un cambio de formato en la página ajena produzca un error
que lo diga, en lugar de una traza genérica.

La versión de cada skill vive en su frontmatter y la revisión falla si deja de
coincidir con la tabla publicada.

### La compuerta editorial

El paso de render tiene un QA que no se desactiva para forzar una salida. El
paso editorial no tenía equivalente: pedía aprobación y no daba con qué
producirla, así que la verificación terminaba siendo una lista de tildes puesta
por quien había escrito el texto.

`check-editorial.mjs` corre el guion contra las reglas del cliente antes de
pedir aprobación. Las reglas viven en la capa del cliente
(`<cliente>/brand/BRAND_RULES.json`) y el verificador lo aporta
`brand-dna-scanner`, que es un paquete separado: el punto de contacto entre
ambos es el contrato de reglas, no el código.

Cuando falta cualquiera de las dos piezas, el script lo informa y la
verificación no corrió. Eso se dice en la entrega. Una compuerta que calla
cuando le falta algo es peor que no tenerla, porque la entrega afirma un filtro
que nunca existió.
