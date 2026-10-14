#!/usr/bin/env python3
"""
Genera el PDF de la «Guía de Markdown [m].seny» a partir de guia-markdown.html.

Uso (desde cualquier carpeta):
    python docs/guia-markdown/construir-pdf.py

Qué hace:
  1. Imprime el HTML a PDF con Chrome sin interfaz (A4, @page del propio HTML).
  2. Lee el PDF, localiza en qué página empieza cada capítulo y cada apartado del
     índice y escribe esos números en el HTML (Chrome no calcula referencias de página).
  3. Vuelve a imprimir y comprueba que los números no han cambiado.

Requisitos: Google Chrome instalado (ruta de Windows por defecto; se puede cambiar con
la variable de entorno CHROME) y la biblioteca pypdf (pip install pypdf).
La salida va a public/practica/m6c3/guia-markdown-mseny.pdf.
"""
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from pypdf import PdfReader

AQUI = Path(__file__).resolve().parent
HTML = AQUI / "guia-markdown.html"
SALIDA = AQUI.parent.parent / "public" / "practica" / "m6c3" / "guia-markdown-mseny.pdf"
CHROME = os.environ.get("CHROME", r"C:/Program Files/Google/Chrome/Application/chrome.exe")


def imprimir(destino: Path) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    if destino.exists():
        destino.unlink()
    orden = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--generate-pdf-document-outline",
        "--virtual-time-budget=6000",
        f"--print-to-pdf={destino}",
        HTML.as_uri(),
    ]
    subprocess.run(orden, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not destino.exists() or destino.stat().st_size < 1000:
        sys.exit("Chrome no ha generado el PDF: revisa la ruta de CHROME.")


def norm(texto: str) -> str:
    return re.sub(r"\s+", "", texto).casefold()


def paginas_de_cada_entrada(pdf: Path, html: str) -> dict:
    lector = PdfReader(str(pdf))
    textos = [norm(p.extract_text() or "") for p in lector.pages]
    inicio = next((i for i, t in enumerate(textos) if norm("Capítulo 01") in t), None)
    if inicio is None:
        sys.exit("No se encuentra el capítulo 1 en el PDF.")
    resultado, actual = {}, inicio
    for m in re.finditer(r'<a href="#([^"]+)" data-s="([^"]*)">', html):
        ident, clave = m.group(1), norm(m.group(2))
        pagina = next((i for i in range(actual, len(textos)) if clave in textos[i]), None)
        if pagina is None:
            sys.exit(f"No se encuentra «{m.group(2)}» en el PDF.")
        resultado[ident] = pagina + 1  # número de página del PDF (la portada es la 1)
        actual = pagina
    return resultado


def escribir_numeros(html: str, paginas: dict) -> str:
    return re.sub(
        r'(<a href="#([^"]+)" data-s="([^"]*)">.*?<span class="p">)\d+(</span></a>)',
        lambda m: f'{m.group(1)}{paginas[m.group(2)]:02d}{m.group(4)}',
        html,
        flags=re.S,
    )


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    with tempfile.TemporaryDirectory() as tmp:
        prueba = Path(tmp) / "prueba.pdf"
        imprimir(prueba)
        paginas = paginas_de_cada_entrada(prueba, html)
    nuevo = escribir_numeros(html, paginas)
    if nuevo != html:
        HTML.write_text(nuevo, encoding="utf-8")
    imprimir(SALIDA)
    de_nuevo = paginas_de_cada_entrada(SALIDA, HTML.read_text(encoding="utf-8"))
    if de_nuevo != paginas:
        sys.exit("El índice no es estable: vuelve a ejecutar el script.")
    lector = PdfReader(str(SALIDA))
    print(f"PDF: {SALIDA}")
    print(f"Páginas: {len(lector.pages)} · Tamaño: {SALIDA.stat().st_size / 1024:.0f} KB")
    for ident, pagina in paginas.items():
        print(f"  {ident:>6} -> {pagina}")


if __name__ == "__main__":
    main()
