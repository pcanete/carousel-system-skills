#!/usr/bin/env python3
"""Verificación del extractor, sin salir a la red.

El extractor depende del formato de la página embed de Instagram, que puede
cambiar sin aviso. Estas pruebas cubren lo que se puede verificar localmente:
qué enlaces acepta, y que un cambio de formato produzca un error que diga qué
pasó en lugar de una traza genérica.

Uso: python scripts/test_extractor.py
"""

from __future__ import annotations

import html
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from extract_instagram_carousel import (  # noqa: E402
    canonicalize,
    choose_resource,
    parse_media,
)

failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  ok  {label}")
    else:
        failures.append(f"{label}{f': {detail}' if detail else ''}")
        print(f"  FALLA  {label}")


def expect_error(label: str, fn, fragment: str) -> None:
    try:
        fn()
    except Exception as exc:  # noqa: BLE001 - se inspecciona el mensaje
        check(label, fragment.lower() in str(exc).lower(), f"mensaje: {exc}")
        return
    check(label, False, "no lanzó error")


print("canonicalización")

canonical, shortcode = canonicalize("https://www.instagram.com/p/ABC123_-x/?igshid=1")
check("normaliza y extrae shortcode", canonical == "https://www.instagram.com/p/ABC123_-x/" and shortcode == "ABC123_-x")

canonical_bare, _ = canonicalize("https://instagram.com/p/ABC123/")
check("acepta el dominio sin www", canonical_bare == "https://www.instagram.com/p/ABC123/")

expect_error("rechaza otro dominio", lambda: canonicalize("https://example.invalid/p/ABC/"), "instagram.com")
expect_error("rechaza texto suelto", lambda: canonicalize("no-es-una-url"), "instagram.com")
expect_error("rechaza ruta sin /p/", lambda: canonicalize("https://instagram.com/algo"), "SHORTCODE")

# Un enlace a un dominio que sólo termina en instagram.com no es Instagram.
expect_error(
    "rechaza dominio suplantado",
    lambda: canonicalize("https://notinstagram.com/p/ABC/"),
    "instagram.com",
)

print("parseo del contexto")

def page_with(context: dict) -> str:
    payload = json.dumps(json.dumps(context))
    return f'<html><body><script>window.__d("PolarisEmbed",[],{{"contextJSON":{payload}}})</script></body></html>'


media = parse_media(
    page_with(
        {
            "gql_data": {
                "shortcode_media": {
                    "owner": {"username": "cuenta"},
                    "edge_media_to_caption": {"edges": [{"node": {"text": "hola"}}]},
                }
            }
        }
    )
)
check("extrae el media del contexto", media.get("owner", {}).get("username") == "cuenta")

check(
    "sobrevive al escapado HTML del contexto",
    parse_media(
        f'<script>{{"contextJSON":{json.dumps(html.escape(json.dumps({"gql_data": {"shortcode_media": {"owner": {"username": "x"}}}})))}}}</script>'
    ).get("owner", {}).get("username")
    == "x",
)

# Los dos modos en que Instagram puede romper el extractor.
expect_error(
    "página sin contexto: dice que puede ser un cambio de formato",
    lambda: parse_media("<html><body>nada</body></html>"),
    "actualizarse",
)

expect_error(
    "contexto con otra forma: dice que el formato cambió",
    lambda: parse_media(page_with({"otra_cosa": {}})),
    "formato cambió",
)

print("selección de recurso")

check(
    "elige el ancho más cercano",
    choose_resource(
        {
            "display_resources": [
                {"config_width": 150, "src": "chico"},
                {"config_width": 640, "src": "grande"},
            ]
        },
        480,
    )
    == "grande",
)

check(
    "cae a display_url cuando no hay resources",
    choose_resource({"display_url": "unico"}, 240) == "unico",
)

print("")

if failures:
    print(f"{len(failures)} verificación(es) fallida(s):")
    for failure in failures:
        print(f"  - {failure}")
    raise SystemExit(1)

print("extractor: verificaciones OK")
