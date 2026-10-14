#!/usr/bin/env python3
"""Empaqueta las plantillas de M6 · C3 en public/practica/m6c3/.

Uso (desde la raíz del repositorio):  python docs/m6c3-plantillas/empaquetar.py

1. Copia la skill memorandum-cierre/ (fuente única) dentro del plugin.
2. Valida cada SKILL.md y cada agente: name (minúsculas, números y guiones; ≤ 64;
   sin «anthropic» ni «claude»; igual al nombre de la carpeta), description (≤ 200),
   cuerpo de menos de 500 líneas; plugin.json con name, version, description y author;
   README de al menos 40 palabras; LICENSE; sin carpeta bin/.
3. Escribe dos ZIP con la carpeta como única entrada de nivel superior:
     skill-memorandum-cierre.zip  -> memorandum-cierre/…
     plugin-cierre-mensual.zip    -> cierre-mensual/…
"""

import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

BASE = Path(__file__).resolve().parent
RAIZ = BASE.parents[1]
SALIDA = RAIZ / "public" / "practica" / "m6c3"
SKILL = BASE / "memorandum-cierre"
PLUGIN = BASE / "cierre-mensual"
FECHA_ZIP = (2026, 10, 14, 0, 0, 0)  # fecha fija: ZIP reproducibles

errores = []


def frontmatter(ruta):
    texto = ruta.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---\n(.*)", texto, re.S)
    if not m:
        errores.append("{}: sin cabecera YAML".format(ruta))
        return {}, ""
    campos = {}
    for linea in m.group(1).splitlines():
        if ":" in linea and not linea.startswith(" "):
            k, v = linea.split(":", 1)
            campos[k.strip()] = v.strip()
    return campos, m.group(2)


def validar_skill(carpeta):
    campos, cuerpo = frontmatter(carpeta / "SKILL.md")
    nombre, desc = campos.get("name", ""), campos.get("description", "")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", nombre) or len(nombre) > 64:
        errores.append("{}: name no válido «{}»".format(carpeta.name, nombre))
    if "anthropic" in nombre or "claude" in nombre:
        errores.append("{}: name contiene una palabra reservada".format(carpeta.name))
    if nombre != carpeta.name:
        errores.append("{}: name «{}» distinto del nombre de la carpeta".format(carpeta.name, nombre))
    if not desc or len(desc) > 200:
        errores.append("{}: description vacía o de más de 200 caracteres ({})".format(carpeta.name, len(desc)))
    if len(cuerpo.splitlines()) >= 500:
        errores.append("{}: cuerpo de 500 líneas o más".format(carpeta.name))
    for ref in re.findall(r"`((?:references|scripts|assets)/[^`\s]+)`", cuerpo):
        if not (carpeta / ref).is_file():
            errores.append("{}: cita {} y no existe".format(carpeta.name, ref))
    print("  skill {:24} name {:2} · description {:3} · cuerpo {:3} líneas".format(
        nombre, len(nombre), len(desc), len(cuerpo.splitlines())))


def validar_agente(ruta):
    campos, cuerpo = frontmatter(ruta)
    for k in ("name", "description"):
        if not campos.get(k):
            errores.append("{}: falta {}".format(ruta.name, k))
    print("  agente {:23} description {:3} · tools {} · model {}".format(
        campos.get("name", "?"), len(campos.get("description", "")), campos.get("tools"), campos.get("model")))


def validar_plugin():
    manifiesto = json.loads((PLUGIN / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
    for k in ("name", "version", "description", "author"):
        if not manifiesto.get(k):
            errores.append("plugin.json: falta {}".format(k))
    if manifiesto.get("name", "").startswith(("claude-", "anthropic-")):
        errores.append("plugin.json: name con prefijo reservado")
    if manifiesto.get("name") != PLUGIN.name:
        errores.append("plugin.json: name distinto de la carpeta")
    readme = re.sub(r"```.*?```", "", (PLUGIN / "README.md").read_text(encoding="utf-8"), flags=re.S)
    palabras = len(re.findall(r"\w+", readme))
    if palabras < 40:
        errores.append("README.md: {} palabras (mínimo 40)".format(palabras))
    if not (PLUGIN / "LICENSE").is_file():
        errores.append("falta LICENSE")
    if (PLUGIN / "bin").exists():
        errores.append("el plugin tiene bin/: no se instalaría en la app ni en Cowork")
    print("  plugin {} {} · README {} palabras".format(manifiesto.get("name"), manifiesto.get("version"), palabras))
    for skill in sorted((PLUGIN / "skills").iterdir()):
        validar_skill(skill)
    for agente in sorted((PLUGIN / "agents").glob("*.md")):
        validar_agente(agente)


def comprimir(carpeta, destino):
    archivos = sorted(p for p in carpeta.rglob("*") if p.is_file() and "__pycache__" not in p.parts)
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        for p in archivos:
            nombre = "{}/{}".format(carpeta.name, p.relative_to(carpeta).as_posix())
            info = zipfile.ZipInfo(nombre, FECHA_ZIP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, p.read_bytes())
    print("  {} · {} archivos · {} bytes".format(destino.name, len(archivos), destino.stat().st_size))


def main():
    destino_skill = PLUGIN / "skills" / SKILL.name
    if destino_skill.exists():
        shutil.rmtree(destino_skill)
    shutil.copytree(SKILL, destino_skill)
    print("Validación")
    validar_skill(SKILL)
    validar_plugin()
    if errores:
        for e in errores:
            print("  ERROR " + e)
        return 1
    SALIDA.mkdir(parents=True, exist_ok=True)
    print("Empaquetado")
    comprimir(SKILL, SALIDA / "skill-memorandum-cierre.zip")
    comprimir(PLUGIN, SALIDA / "plugin-cierre-mensual.zip")
    return 0


if __name__ == "__main__":
    sys.exit(main())
