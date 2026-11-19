# Reglas de trading — MODO PAPEL (Bolsa de Madrid)

> Solo papel. Nada de dinero real. Ninguna skill de este laboratorio puede enviar órdenes
> (trader-broker no está instalada y no hay conector de bróker configurado).

Fijadas por Catalina el 2026-11-19. Hora: **Madrid (Europe/Madrid)**.

| Regla | Valor |
| --- | --- |
| Pérdida máxima por operación (si salta el stop) | **25 €** |
| Pérdida máxima por día | **75 €** — al alcanzarla, no se abren más operaciones ese día |
| Ventana de entradas | **09:15 a 17:00** (no antes de que se forme el rango de apertura 09:00–09:15) |
| Cerrar todo | **17:25**, antes de la subasta de cierre (17:30–17:35) |
| Nº máximo de operaciones por día | **Pendiente** — no se ha fijado todavía |

## Cómo se aplican

- **Tamaño:** acciones = REDONDEAR.MENOS(25 € / (entrada − stop)). Si una sola acción ya
  arriesga más de 25 €, no hay operación.
- **Stop obligatorio** antes de entrar, y nunca se aleja una vez dentro.
- **Día cerrado** cuando la suma de pérdidas realizadas llega a −75 €.
  Con 25 € por operación, eso son como mucho 3 pérdidas completas seguidas.
- **Sin posiciones de un día para otro:** a las 17:25 todo fuera, gane o pierda.
- Cada operación se anota en `diario_paper.xlsx`, que comprueba el riesgo por operación
  y el resultado del día contra estas reglas.

## Pendiente

- Decidir el nº máximo de operaciones por día y anotarlo aquí y en la hoja `Reglas`
  del diario (celda B7).
