---
name: conciliacion-bancaria
description: Concilia el extracto bancario en CSV con el mayor de bancos en Excel mediante un script y propone los asientos de ajuste de las normas de cierre. Úsala al conciliar bancos en el cierre.
---

# Conciliación bancaria del cierre mensual

La conciliación tiene que dar siempre el mismo resultado con los mismos archivos. Por eso el cálculo no se hace leyendo los movimientos uno a uno: lo hace el script `scripts/conciliar.py`, y esta skill se ocupa de prepararlo, ejecutarlo e interpretar su salida con las normas de cierre.

## Cuándo usarla

- Cuando se pide conciliar el banco, cuadrar el extracto con la contabilidad o explicar la diferencia entre el saldo del banco y el de la cuenta 572.
- No se usa para conciliar cuentas de clientes o de proveedores.

## Entradas

1. El **extracto del banco** del mes en CSV (separador «;», decimales con coma), con las columnas Fecha operación, Fecha valor, Concepto, Importe y Saldo.
2. El **mayor de la cuenta de bancos** en Excel, con las columnas Fecha, Asiento, Concepto, Debe, Haber y Saldo, y una fila «Saldo inicial».
3. Las **normas de cierre**, apartado 4 (conciliación bancaria).

Si falta alguno de los dos archivos, dilo y detente.

## Pasos

1. Localiza los dos archivos en la carpeta de trabajo. No los modifiques ni los muevas.
2. Ejecuta el script desde la carpeta de trabajo:

   ```
   python3 ${CLAUDE_SKILL_DIR}/scripts/conciliar.py EXTRACTO.csv MAYOR.xlsx --salida conciliacion-MES.md
   ```

   Si la variable `CLAUDE_SKILL_DIR` no está definida, usa la ruta de la carpeta que contiene este SKILL.md.

   Si el script responde que falta `openpyxl`, instálalo (`pip install openpyxl`) o pide permiso para hacerlo, y repite.
3. Lee el informe. El script devuelve el código 0 si la conciliación cuadra y el 2 si no cuadra.
4. Presenta el resultado con la estructura del informe: saldos, partidas por conciliar, ajustes propuestos y comprobación.
5. Si se pide un Excel, crea `conciliacion-MES.xlsx` con dos hojas: «Conciliación» (saldos, partidas y comprobación) y «Ajustes propuestos» (una fila por asiento, con su importe y su criterio).

## Cómo se interpreta cada partida (normas de cierre, apartado 4)

| Partida | Tratamiento |
|---|---|
| Solo en el banco (comisiones, recibos devueltos) | Asiento de ajuste en el mismo mes (4.2). |
| Solo en el mayor (cobros o pagos que el banco aún no refleja) | En tránsito: **no se ajusta**; se lista en el memorándum con su fecha prevista (4.3). |
| Mismo importe y concepto repetidos en el mayor, una sola vez en el banco | Posible duplicado: proponer la anulación del asiento repetido. |
| Diferencia de importe divisible entre 9 | Posible error de transposición de cifras (4.4): proponer la corrección del asiento. |

## Comprobaciones finales

- [ ] Los saldos iniciales del banco y de la contabilidad coinciden.
- [ ] Saldo contable + ajustes − partidas en tránsito = saldo según el banco.
- [ ] Cada ajuste indica el criterio de las normas que lo justifica.
- [ ] Los archivos originales no se han modificado.

## Qué no hacer

- No calcules la conciliación a mano si el script puede ejecutarse: el resultado debe ser reproducible.
- No ajustes las partidas en tránsito.
- No registres asientos ni modifiques el mayor: la skill propone; una persona registra.
- Si el resultado es «NO CUADRA», no fuerces el cuadre: enumera lo que queda sin explicar.
