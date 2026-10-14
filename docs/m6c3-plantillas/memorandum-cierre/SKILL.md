---
name: memorandum-cierre
description: Redacta el memorándum de cierre mensual para Dirección General con los cinco apartados y el formato de cifras de las normas de cierre. Úsala al preparar o revisar el cierre de un mes.
---

# Memorándum de cierre mensual

Esta skill redacta el memorándum que Dirección Financiera envía a Dirección General al cerrar cada mes. El formato lo fijan las normas de cierre de la empresa; la skill las aplica sin añadir apartados ni cambiar el orden.

## Cuándo usarla

- Cuando se pide el memorándum, el informe o la nota de cierre de un mes.
- Cuando se pide revisar un borrador de memorándum antes de enviarlo.
- No se usa para informes trimestrales ni para presupuestos: tienen otro formato.

## Entradas

Antes de redactar, localiza en la carpeta o en el proyecto de trabajo:

1. **Normas de cierre** (`normas-cierre.docx`): calendario (apartado 1), conciliación (apartado 4), KPI (apartado 5) y formato del memorándum (apartado 6). Mandan sobre esta skill si hay contradicción.
2. **Ventas del año** (`ventas-tiendas-*.xlsx`): hoja del año en curso y hoja del año anterior, con una fila por mes, tienda y familia.
3. **Memorándum del mes anterior**: modelo de estilo y de extensión. No copies sus cifras.
4. **Resultado de la conciliación bancaria**, si existe (por ejemplo, el que produce la skill `conciliacion-bancaria`).
5. **Gastos del mes ya depurados**, si existen: reimputaciones por devengo y supuestos de centro de coste.

Si falta una entrada obligatoria (1 o 2), dilo y detente. Si falta una opcional (3, 4 o 5), redacta el apartado correspondiente con la frase «Pendiente: no se ha recibido…» en lugar de inventar el dato.

## Pasos

1. **Fecha de envío.** D es el último día natural del mes cerrado. El memorándum se envía en D+7 (días naturales). Si D+7 cae en sábado o domingo, se envía el lunes siguiente. Escribe la fecha completa, con el día de la semana comprobado.
2. **Cifras del mes.** Calcula los KPI con las definiciones de `references/kpi.md`: ventas, margen bruto %, variación interanual, total y por tienda. Usa el mismo mes del año anterior para la comparación.
3. **Las tres tiendas que más crecen.** Ordena las tiendas por variación interanual y toma las tres primeras. Señala también cualquier tienda con variación negativa.
4. **Redacción.** Rellena la plantilla de `references/formato-memorandum.md`, apartado por apartado, con el registro del memorándum del mes anterior: formal, frases completas, sin adjetivos de valoración.
5. **Tesorería.** Toma de la conciliación el saldo conciliado, los asientos de ajuste y las partidas en tránsito (estas se listan con su fecha prevista; no se ajustan).
6. **Incidencias.** Recoge los gastos reimputados por devengo, los ajustes de inventario superiores al 1 % y cualquier supuesto que se haya hecho (por ejemplo, un centro de coste asignado sin dato de origen).
7. **Comprobaciones finales** (abajo) antes de entregar.

## Formato

- Una página. Cinco apartados, en este orden y con estos títulos: «1. Resumen», «2. Ventas por tienda», «3. Margen», «4. Tesorería y conciliación», «5. Incidencias y ajustes».
- Encabezado: «Para: Dirección General · De: Dirección Financiera · Fecha: …».
- Cierre: «Dirección Financiera».
- Entrega en el formato que se pida (documento de Word, artefacto o Markdown). Si no se indica, documento de Word.

## Reglas de cifras

- Euros **sin decimales** y con **punto de millar**: `1.083.815 €`.
- Porcentajes con **un decimal** y coma decimal: `60,1 %`. Variaciones con signo: `+5,2 %`, `−3,4 %`.
- Redondea solo al presentar; calcula siempre con los importes completos.
- Cada cifra debe salir de una de las entradas. Si una cifra no se puede calcular, no la estimes: indícalo.

## Comprobaciones finales

Antes de entregar, comprueba y enumera el resultado de cada punto:

- [ ] La fecha es D+7 o, si D+7 cae en fin de semana, el lunes siguiente.
- [ ] Están los cinco apartados, con los títulos exactos y en orden.
- [ ] La suma de las ventas por tienda coincide con el total del resumen.
- [ ] Las tres tiendas destacadas son las de mayor variación interanual.
- [ ] Todas las cifras en euros van sin decimales y con punto de millar; todos los porcentajes, con un decimal.
- [ ] El saldo de tesorería coincide con el saldo conciliado y las partidas en tránsito no se han ajustado.
- [ ] Cada supuesto está escrito como supuesto.

## Qué no hacer

- No inventes cifras, causas ni incidencias. Si la causa de una variación no figura en los datos, escribe que está pendiente de análisis.
- No cambies los títulos ni el orden de los apartados, ni añadas otros.
- No copies cifras del memorándum del mes anterior.
- No envíes el memorándum: la skill lo redacta; el envío lo decide una persona.
- No incluyas datos personales ni credenciales.
