---
name: carousel-builder
description: Diseña y produce carruseles de Instagram listos para publicar —guion, slides JPG, caption y alt-text— mediante un pipeline local o una plantilla de Canva. Usar para crear o transformar contenido en carruseles sociales y para instalar su sistema editorial y visual por cliente; no activar para analizar referencias, presentaciones, sitios web, fotos o videos sueltos.
metadata:
  version: "0.2.0"
---

# Carousel Builder

Producir carruseles publicables sin inventar decisiones de marca. El skill aporta oficio narrativo y ejecución; la capa del cliente define el POV editorial y el sistema visual.

## Capas

- **Skill:** formatos narrativos, esquema, render y QA.
- **Cliente:** fuente de ideas, POV y configuración visual.
- **Pieza:** guion aprobado, spec, fotos designadas y entregables.

La estructura sugerida es `clients/<dominio>/`, pero se debe respetar una estructura canónica existente en el workspace.

## Preparación del cliente

Localizar la capa del cliente dentro del workspace autorizado. Si falta información material para producir, leer [references/instalacion-cliente.md](references/instalacion-cliente.md). No buscar fuera del workspace ni consultar sistemas externos salvo que el usuario los haya puesto en alcance.

El sistema visual puede inferirse de assets autorizados solo como borrador. Antes del primer render final debe estar aprobado por la persona responsable de la marca.

## Producción

1. **Definir el input.** Puede ser una idea del atlas, una nota a transformar, un guion existente o una ficha creada por `analizar-carrusel-referencia`. Una ficha aporta mecanismos, nunca frases o identidad para copiar.
2. **Elegir estructura.** Leer [references/formatos.md](references/formatos.md) cuando haya que seleccionar o adaptar un formato narrativo.
3. **Escribir el guion.** Una idea por slide, hook sin preámbulo y datos trazables. Verificar afirmaciones factuales que lo requieran y conservar las fuentes en `guion.md`.
4. **Verificar y confirmar aprobación editorial.** Antes de mostrar el texto, correr la verificación contra las reglas del cliente:

   ```powershell
   node <skill>/scripts/check-editorial.mjs --piece <pieza>/guion.md --client-dir <cliente>
   ```

   El paso 7 tiene QA que no se desactiva para forzar una salida. Este es su equivalente para el contenido: verifica la forma del slide y también lo que dice.

   Las reglas viven en `<cliente>/brand/BRAND_RULES.json` y el verificador lo aporta `brand-dna-scanner`. Si falta cualquiera de los dos, el script lo informa y la verificación **no corrió**: eso se dice en la entrega, no se omite. Las reglas que requieren criterio se reportan como pendientes de juicio y viajan así a quien aprueba; nunca se dan por cumplidas.

   Una aprobación explícita ya presente en el pedido o en un guion marcado como aprobado satisface la condición de aprobación. No sustituye a la verificación: se corre igual, porque su resultado es parte de lo que se aprueba.
5. **Resolver fotos.** Usar solo fotos designadas por el usuario o ya vinculadas de forma inequívoca a la pieza. Se pueden localizar dentro del workspace autorizado; no elegir imágenes por preferencia propia. Copiar las seleccionadas a `fotos/` sin borrar los originales ni vaciar carpetas de entrada.
6. **Construir el spec.** Leer [references/esquemas.md](references/esquemas.md) y validar rutas, tipos y campos obligatorios.
7. **Renderizar y revisar.** Ejecutar una de las vías siguientes. No entregar si el QA falla o si la revisión visual detecta texto cortado, fuentes sustituidas o imágenes ausentes.
8. **Empaquetar.** Entregar `final/slide-NN.jpg`, `caption.md`, `guion.md`, alt-text por slide y los archivos fuente de la pieza.

## Vía local

Es la opción predeterminada cuando existe configuración visual local:

```powershell
node <skill>/scripts/build.mjs --config <cliente>/brand/carousel/carousel.config.json --spec <pieza>/slides.json --out <pieza>
pwsh -File <skill>/scripts/render.ps1 -Dir <pieza>
```

`build.mjs` genera HTML autocontenido con texto escapado, política de contenido restrictiva y QA embebido. `render.ps1` captura con Edge, bloquea la conversión si detecta fallos y regenera únicamente los artefactos administrados por el pipeline.

Si el script falla, corregir el spec o el layout; no desactivar el QA para forzar una salida.

## Vía Canva

Usarla cuando el usuario elija Canva o el cliente tenga allí una plantilla viva. Leer [references/canva.md](references/canva.md) y utilizar las capacidades actuales del conector disponible. Trabajar siempre sobre una copia del master.

No publicar fotos del cliente en servicios anónimos o URLs temporales para puentear limitaciones del conector. Si Canva no puede recibir un archivo local de forma segura, pedir que el usuario lo suba a su cuenta o que autorice una fuente aprobada.

## Reglas de oficio

- Una idea principal por slide.
- Recortar antes de reducir tipografía hasta volverla ilegible.
- Exigir al menos un detalle específico que evite contenido genérico.
- Abrir con tensión o promesa, no con contexto.
- Cerrar con una idea que trascienda la pieza o un CTA pertinente.
- Los datos sin fuente confiable se eliminan o se presentan explícitamente como no verificados.
- Usar 6–8 slides como orientación, no como obligación.
- Ante conflicto entre una convención del skill y el POV aprobado, gana el cliente.

## Entrega

Informar la cantidad de slides, la vía utilizada, el estado de QA, el resultado de la verificación editorial —incluidas las reglas que quedaron pendientes de juicio, o que no se pudo verificar—, la carpeta entregable y cualquier dato o asset pendiente. No afirmar que una pieza está lista para publicar si faltan aprobación editorial, fotos requeridas o QA visual.
