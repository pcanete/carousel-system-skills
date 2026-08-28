#!/usr/bin/env python3
"""Extrae metadatos y URLs transitorias de un carrusel público de Instagram.

No descarga ni guarda imágenes. La salida JSON se envía a stdout.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


CONTEXT_RE = re.compile(r'contextJSON":"((?:\\.|[^"\\])*)"')
SHORTCODE_RE = re.compile(r"^/p/([A-Za-z0-9_-]+)/?")


def canonicalize(value: str) -> tuple[str, str]:
    parsed = urllib.parse.urlparse(value.strip())
    host = parsed.netloc.lower().split(":", 1)[0]
    if host not in {"instagram.com", "www.instagram.com"}:
        raise ValueError("Solo se admiten enlaces públicos de instagram.com")
    match = SHORTCODE_RE.match(parsed.path)
    if not match:
        raise ValueError("Se esperaba un enlace con formato instagram.com/p/SHORTCODE/")
    shortcode = match.group(1)
    return f"https://www.instagram.com/p/{shortcode}/", shortcode


def fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; CarouselReferenceAnalyzer/1.0)",
            "Accept-Language": "es-AR,es;q=0.9,en;q=0.7",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def choose_resource(node: dict[str, Any], width: int) -> str:
    resources = node.get("display_resources") or []
    if resources:
        return min(resources, key=lambda item: abs(int(item.get("config_width", 0)) - width)).get("src", "")
    return node.get("display_url", "")


def parse_media(page: str) -> dict[str, Any]:
    """Aísla el parseo del HTML para poder verificarlo sin salir a la red.

    Depende del formato de la página embed de Instagram, que puede cambiar sin
    aviso. Cuando eso pasa, el error tiene que decirlo: un fallo genérico manda
    a buscar el problema en el post en lugar de en el extractor.
    """
    match = CONTEXT_RE.search(page)
    if not match:
        raise RuntimeError(
            "Instagram no expuso el contexto público del post. "
            "Puede ser un post privado, eliminado o restringido por edad; o "
            "Instagram cambió el formato de la página embed, y entonces el "
            "extractor necesita actualizarse."
        )
    context_text = json.loads('"' + match.group(1) + '"')
    context = json.loads(html.unescape(context_text))
    try:
        return context["gql_data"]["shortcode_media"]
    except (KeyError, TypeError) as exc:
        raise RuntimeError(
            "El contexto de Instagram no tiene la forma esperada: falta "
            "gql_data.shortcode_media. El formato cambió y el extractor "
            "necesita actualizarse."
        ) from exc


def extract(url: str, width: int) -> dict[str, Any]:
    canonical, shortcode = canonicalize(url)
    page = fetch_text(canonical + "embed/")
    media = parse_media(page)
    edges = media.get("edge_sidecar_to_children", {}).get("edges", [])
    if not edges:
        edges = [{"node": media}]
    caption_edges = media.get("edge_media_to_caption", {}).get("edges", [])
    caption = caption_edges[0]["node"].get("text", "") if caption_edges else ""
    return {
        "canonical_url": canonical,
        "shortcode": shortcode,
        "owner": media.get("owner", {}).get("username", ""),
        "likes": media.get("edge_liked_by", {}).get("count"),
        "comments": media.get("edge_media_to_comment", {}).get("count"),
        "caption": caption,
        "slide_count": len(edges),
        "slides": [
            {
                "position": index,
                "width": edge["node"].get("dimensions", {}).get("width"),
                "height": edge["node"].get("dimensions", {}).get("height"),
                "accessibility_caption": edge["node"].get("accessibility_caption"),
                "temporary_image_url": choose_resource(edge["node"], width),
            }
            for index, edge in enumerate(edges, start=1)
        ],
        "persistence_warning": "Las URLs de imagen son transitorias. No persistirlas ni descargar archivos.",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("url", help="Enlace público instagram.com/p/SHORTCODE/")
    parser.add_argument("--width", type=int, default=240, choices=(150, 240, 320, 480, 640, 720, 1080))
    args = parser.parse_args()
    try:
        print(json.dumps(extract(args.url, args.width), ensure_ascii=False, indent=2))
        return 0
    except (ValueError, RuntimeError, KeyError, json.JSONDecodeError, urllib.error.URLError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
