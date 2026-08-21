# Installation

## Install through Codex

Give Codex the public directory URL for either skill:

```text
https://github.com/pcanete/carousel-system-skills/tree/main/skills/analizar-carrusel-referencia
https://github.com/pcanete/carousel-system-skills/tree/main/skills/carousel-builder
```

Install both for the reference-to-production workflow or only the relevant one
for a narrower task.

## Manual installation

Copy each skill directly under the local Codex skill directory:

```text
~/.codex/skills/<skill-name>/SKILL.md
```

Do not place the repository root there.

## Runtime requirements

### analizar-carrusel-referencia

- Python 3;
- public browser access when the lightweight extractor cannot read a post.

The Python extractor uses only the standard library.

### carousel-builder

- Node.js;
- PowerShell;
- Microsoft Edge;
- `System.Drawing` on Windows;
- an approved client configuration or Canva template.

The local Node builder has no package dependencies. Canva is optional and
requires a connected, authorized integration.
