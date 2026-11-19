# day-trader-skill — auditoría y prueba con la Bolsa de Madrid (MODO PAPEL)

Fecha: 2026-11-19. Repo: https://github.com/Jakeschincariol/day-trader-skill (original, sin forks),
commit `3d0f4ef` ("The Trader skill v2: 11 day-trading skills"), licencia MIT.

## 1. Seguridad

Se leyeron los 11 SKILL.md completos. En los .py se buscaron conexiones de red, ejecución de comandos,
escritura en disco y ofuscación, y se leyeron enteras las funciones que hacen peticiones.

- **Dependencias:** solo la biblioteca estándar de Python. `pdftotext` es opcional (trader-pelosi).
- **Red:** todas las peticiones son GET, sin cuerpo.
  - Yahoo Finance: `query1/query2.finance.yahoo.com`, `feeds.finance.yahoo.com`.
  - `nasdaqtrader.com`, `stooq.com`.
  - SEC: `www.sec.gov`, `data.sec.gov`.
  - Cámara de Representantes de EE. UU.: `disclosures-clerk.house.gov`.
  - budget, risk y broker no usan la red.
- **Datos que salen:** un User-Agent fijo `day-trader-skill/2.0`. news y analyst envían a la SEC tu
  nombre y email **solo si los configuras** (`sec_user_agent` / `SEC_USER_AGENT`).
  No hay telemetría, POST ni ofuscación.
- **Disco:** solo `trader/` (relativo a la carpeta de trabajo); trader-pelosi además guarda PDFs en `trader/state/ptr-pdfs/`.
- **Ejecución:** solo `pdftotext -layout` (trader-pelosi).
- **Órdenes:** ningún .py habla con un bróker. El único camino es `trader-broker/SKILL.md`, que
  indica a Claude usar el MCP de Alpaca o el conector de IBKR. **trader-broker NO está instalada.**

## 2. Instalación

Instaladas en `~/.claude/skills/` **del contenedor en la nube** (no de tu PC):
trader-alerts, analyst, budget, entry, exit, news, pelosi, risk, scanner, timemachine.
**trader-broker no se instaló.** Python 3.13.18 (≥ 3.8). No hizo falta instalar dependencias.

## 3. Prueba con SAN.MC, ITX.MC, IBE.MC

Hubo que permitir `query1/query2.finance.yahoo.com` en la red del entorno: antes, el proxy los bloqueaba con un 403.

| Prueba | Resultado |
| --- | --- |
| Yahoo directo, 5 min | ✅ 103 velas/sesión (09:00–17:30 Madrid), hasta 60 días |
| Yahoo directo, 1 min | ✅ unos 5 días. Minutos sin cierre en la sesión del 18/11: IBE 103/511, ITX 68/511, SAN 1/511 |
| `scan.py daily` / `orb` instalados | ❌ 0 de 3: convierte `SAN.MC` en `SAN-MC` y Yahoo responde 404 |
| `entry.py check` 1 y 5 min instalado | ❌ "Yahoo has no data for SAN.MC" (misma causa) |
| Copia de diagnóstico sin la conversión: `daily` | ✅ 3 de 3 descargados; ningún patrón detectado ese día |
| Copia de diagnóstico: `orb` | ❌ 0 utilizables: el endpoint `spark` devuelve 99 de 103 velas y la regla exige todas |
| Copia de diagnóstico: `entry` | ⚠️ Funciona, pero el rango de apertura es el de 9:30–9:45 de Nueva York = 15:30–15:45 en Madrid (incorrecto) |
| Time Machine (offline) | ❌ "data is for SAN.MC but the plan is for SAN.MC" (bug al comparar tickers); además solo acepta sesiones de 9:30–16:00 de Nueva York |

## 4. Adaptación propuesta para Madrid (NO aplicada)

1. **Tickers:** convertir `.` en `-` solo en sufijos de clase de una letra (BRK.B), nunca en `.MC`. Afecta a:
   `scan.py:271`, `entry.py:231`, `exit.py:394`, `timemachine.py:190` y `:689`, `news.py:195`, `alerts.py:197` y `:201`.
2. **Reloj:** zona `Europe/Madrid` en lugar de los cálculos fijos de Nueva York (horario de verano de EE. UU.).
   Sesión 09:00–17:30 y subasta de cierre 17:30–17:35.
3. **Rango de apertura:** 09:00–09:15, con la primera ruptura posible en la vela que cierra a las 09:20.
   Una sesión completa para la Time Machine = 102 velas de 5 min (09:00–17:25).
4. **Ventana:** sin entradas antes de las 09:15 ni después de las 17:00; todo cerrado a las 17:25.
   Ojo a las 15:30 (apertura de EE. UU.).
5. **Festivos de BME:** 1 ene, Viernes Santo, Lunes de Pascua, 1 may, 25 y 26 dic; medias sesiones hasta las 14:00
   el 24 y el 31 dic. **Comprobar en el calendario oficial de BME.**
6. **Datos:** universo del IBEX 35 o el Mercado Continuo en lugar de las listas de Nasdaq; `chart` en vez de `spark`
   en el ORB; importes en euros.
