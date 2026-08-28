# Carousel System Skills

**Un sistema abierto de skills para convertir carruseles públicos en aprendizaje reutilizable y producir nuevas piezas sociales con criterio editorial, seguridad y QA.**

`carousel-system-skills` reúne dos capacidades independientes y coordinadas:

| Skill | Pregunta que responde | Salida principal |
| --- | --- | --- |
| `analizar-carrusel-referencia` | ¿Cómo funciona este carrusel y qué mecanismos pueden aprenderse sin copiarlo? | Análisis textual y, si se autoriza, ficha reutilizable |
| `carousel-builder` | ¿Cómo se convierte una idea o contenido aprobado en un carrusel publicable? | Guion, JPGs, caption, alt-text y fuentes |

Se mantienen separadas porque analizar y producir tienen permisos, herramientas y entregables distintos. Una ficha del primer skill puede alimentar al segundo, pero nunca autoriza a copiar frases, secuencias distintivas o identidad visual.

## Principios

### Evidencia antes que interpretación

El analizador distingue transcripción, descripción observable, interpretación e hipótesis. Las afirmaciones del post se registran como contenido publicado, no como hechos verificados.

### Aprender mecanismos, no copiar identidad

Las referencias aportan arquitectura narrativa, ritmo y decisiones de composición. La marca de destino aporta voz, postura, assets y sistema visual.

### Autorización proporcional

Inspeccionar un enlace no autoriza a escribir en un corpus. Crear una pieza no autoriza a publicarla, borrar masters ni exponer fotos del cliente en servicios externos.

### Cliente antes que plantilla universal

El builder aporta oficio y ejecución. El POV editorial y el sistema visual pertenecen a la capa del cliente.

### Render verificable

El pipeline local escapa contenido, restringe scripts, valida assets, evita residuos entre ejecuciones y bloquea piezas con desbordes o colisiones.

## Flujo

```text
Carrusel público
       │
       v
analizar-carrusel-referencia
       │
       ├──> análisis en conversación
       └──> ficha textual autorizada
                    │
Idea / nota / guion ├──> carousel-builder
POV + sistema visual┘          │
                               ├──> vía local: HTML -> Edge -> QA -> JPG
                               └──> vía Canva: copia editable -> revisión visual
```

Los skills pueden utilizarse por separado. El builder acepta una idea, una nota, un guion existente o una ficha de referencia.

## Instalación

### Desde Codex

```text
Instala este skill:
https://github.com/pcanete/carousel-system-skills/tree/main/skills/analizar-carrusel-referencia
```

```text
Instala este skill:
https://github.com/pcanete/carousel-system-skills/tree/main/skills/carousel-builder
```

### Manual

Copiar cada directorio deseado directamente bajo:

```text
~/.codex/skills/<nombre-del-skill>/SKILL.md
```

No instalar el monorepo como un único skill. Consulta [docs/installation.md](docs/installation.md).

## Requisitos

- Codex con soporte para skills;
- Python 3 para el extractor público de Instagram;
- Node.js para construir slides;
- PowerShell, Microsoft Edge y `System.Drawing` para el render local;
- conector de Canva autorizado cuando se elige esa vía.

## Estructura

```text
carousel-system-skills/
├── skills/
│   ├── analizar-carrusel-referencia/
│   └── carousel-builder/
├── docs/
├── scripts/
├── .github/workflows/
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

Cada skill es instalable por separado y conserva todos sus recursos de runtime.

## Desarrollo

```powershell
npm test
```

La validación revisa estructura, frontmatter, referencias internas, patrones inseguros y comportamiento observable del motor local.

## Privacidad y propiedad intelectual

- No incluir fotos, fuentes, credenciales o estrategia privada de clientes.
- Usar materiales públicos o explícitamente autorizados.
- No subir assets privados a hostings anónimos.
- No tratar una referencia como licencia para reutilizar su identidad.
- Mantener procedencia y fuentes de datos factuales.

Consulta [SECURITY.md](SECURITY.md) antes de reportar una vulnerabilidad.

## Estado

Cada skill se versiona por separado; la tabla de [versioning.md](docs/versioning.md) es la fuente y la revisión del repositorio falla si un `SKILL.md` y esa tabla dejan de coincidir. El proyecto está en etapa temprana y evolucionará con pruebas reales y cambios compatibles documentados.

## Licencia

Publicado bajo licencia [MIT](LICENSE).

Concepto y desarrollo inicial: **Patricio Cañete**.
