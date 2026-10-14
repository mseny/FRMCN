# Cierre mensual

Plugin de práctica del curso IA Generativa de [m].seny /academy (módulo 6, clase 3). Reúne en un solo paquete lo que el departamento financiero necesita para el cierre de cada mes, de modo que cualquier persona del equipo trabaje con el mismo procedimiento desde la primera conversación.

## Qué incluye

- **Skill `conciliacion-bancaria`**: concilia el extracto del banco (CSV) con el mayor de la cuenta de bancos (Excel) mediante el script `scripts/conciliar.py`, que da siempre el mismo resultado con los mismos archivos, y propone los asientos de ajuste según las normas de cierre.
- **Skill `memorandum-cierre`**: redacta el memorándum de cierre para Dirección General con los cinco apartados y el formato de cifras de las normas.
- **Agente `revisor-cierre`**: revisa el memorándum contra las normas (fecha de envío, apartados, formato de cifras, tesorería) y devuelve una lista de hallazgos. Los agentes se cargan en Cowork y en Claude Code; la conversación los ignora.

## Cómo se usa

1. Instala el plugin en «Personalización» → «Plugins» → subir un plugin, con este ZIP.
2. Abre una tarea de Cowork sobre la carpeta del cierre (normas, ventas, extracto, mayor y gastos del mes).
3. Pide la conciliación bancaria, después el memorándum, y deja que el revisor lo compruebe antes de darlo por bueno.

## Datos

El plugin no incluye conectores ni envía datos a ningún servicio externo. Trabaja solo con los archivos de la carpeta o del proyecto que se le da. Los datos del curso son sintéticos.

## Requisitos

La skill de conciliación necesita Python 3 y la biblioteca `openpyxl` en el entorno donde se ejecuta, y el interruptor «Ejecución de código en la nube y creación de archivos» activado, en Configuración → «Capacidades».

## Licencia

MIT. Consulta el archivo `LICENSE`.
