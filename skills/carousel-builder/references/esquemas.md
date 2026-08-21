# Esquemas de archivos

## `carousel.config.json`

Los assets de marca se resuelven de forma relativa al archivo de configuración.

```json
{
  "cliente": "example.com",
  "canvas": { "width": 1080, "height": 1350 },
  "colores": {
    "fondo": "#0b0b0b",
    "texto": "#ffffff",
    "textoSecundario": "#e6e6e6",
    "acento": "#e4ff3d",
    "nota": "#9a9a9a"
  },
  "tipografia": {
    "principal": {
      "archivo": [
        { "archivo": "fonts/Marca-Regular.ttf", "peso": 400 },
        { "archivo": "fonts/Marca-Bold.ttf", "peso": 700 }
      ]
    },
    "mono": { "familia": "Consolas" },
    "interlineado": { "titulo": 1.08, "cuerpo": 1.32 }
  },
  "logo": { "archivo": "logo.png", "blend": "screen" },
  "header": { "url": "example.com" },
  "fotos": {
    "filtro": "grayscale(1) contrast(1.08)",
    "velo": "linear-gradient(180deg, rgba(11,11,11,.20) 0%, rgba(11,11,11,.90) 100%)"
  },
  "pie": {
    "reservaPx": 180,
    "tagline": "UNA SERIE DE EXAMPLE",
    "url": "example.com"
  }
}
```

`tipografia.<rol>` admite `{ "familia": "..." }`, un único `archivo` o una lista de archivos con peso. `pie.reservaPx` reserva una zona inferior que el contenido no puede invadir. `header` y `pie` son opcionales.

Por compatibilidad, el motor acepta la propiedad antigua `fuentes` como tipografía principal, pero los configs nuevos deben usar `tipografia`.

## `slides.json`

Las fotos se resuelven de forma relativa al spec. Para que la pieza sea autocontenida, copiarlas primero a su carpeta `fotos/`.

```json
{
  "slug": "regla-cesion-arquero",
  "slides": [
    {
      "kind": "text",
      "tag": "LA REGLA QUE CAMBIÓ TODO",
      "title": "El Mundial más aburrido cambió el fútbol."
    },
    {
      "kind": "rule",
      "year": "2,21",
      "title": "Goles por partido en Italia '90.",
      "body": "El promedio más bajo de los mundiales.",
      "note": "Fuente: archivo oficial"
    },
    {
      "kind": "photo",
      "photo": "fotos/portada.jpg",
      "pos": "center 35%",
      "tag": "SERIE",
      "title": "Título sobre foto",
      "sub": "Bajada opcional."
    },
    {
      "kind": "question",
      "title": "¿Qué protege esta regla?",
      "body": "El ritmo del juego."
    },
    {
      "kind": "closing",
      "tag": "UNA SERIE",
      "title": "LA REGLA QUE CAMBIÓ TODO",
      "body": "Las reglas que hicieron al deporte actual.",
      "cta": "¿Qué regla cambió tu deporte?"
    }
  ]
}
```

Tipos admitidos:

- `text`: tag, title, body.
- `rule`: tag, year, title, body, note.
- `question`: tag, title, body.
- `photo`: photo, pos, tag, title, sub.
- `closing`: tag, title, body, cta.

`title` es obligatorio en todos los tipos. `photo` es obligatorio en slides de tipo `photo`. El marcado `**texto**` aplica el color de acento; no se admite HTML.

## Carpeta de pieza

```text
content/carousels/<fecha>-<slug>/
  slides.json
  guion.md
  caption.md
  fotos/
  build/
  final/
```

`build/` y `final/slide-*.jpg` son regenerables. El pipeline solo limpia archivos que coinciden con sus propios nombres administrados.
