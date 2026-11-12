# Roma Nostra

Guía de viaje interactiva para Roma, del 13 al 16 de noviembre de 2026. Es una web app para el móvil (PWA): se abre en Safari, se añade a la pantalla de inicio y funciona sin conexión.

## Qué hace

- **Hoy**: la parada que toca según la hora de Roma, la siguiente, la próxima reserva fija con cuenta atrás, el tiempo por horas y qué ponerse.
- **Plan**: los cuatro días en línea de tiempo, con ficha por parada (qué mirar, historia, foto, consejo, comer cerca, nota propia).
- **Audioguía**: narración de cada monumento con la voz del teléfono.
- **Mapa 3D**: paradas numeradas por día, sitios para comer, posición propia y vuelo 3D sobre cada monumento.
- **Comer**: 25 sitios elegidos por zona y lista de platos que hay que probar.
- **Cambios en marcha**: «Vamos tarde», «Tenemos hambre», «Estamos cansados», «Si llueve» y plan de aeropuerto. Las reservas fijas no se mueven nunca.
- **Guía**: lista previa al viaje, transporte, seguridad, frases, diario exportable y ajustes.

## Publicarla (GitHub Pages)

1. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**.
2. Elegir la rama que contiene estos archivos y la carpeta `/ (root)`. Guardar.
3. En uno o dos minutos estará en `https://<usuario>.github.io/<repositorio>/`.

GitHub Pages en un repositorio privado requiere un plan de pago; en un repositorio público es gratis. Por eso aquí no hay nombres, códigos QR, localizadores ni la dirección exacta del alojamiento: esta última se escribe en **Guía → Ajustes** y se guarda solo en el teléfono.

Cualquier otro alojamiento estático con HTTPS sirve igual: basta subir la carpeta tal cual. No hay paso de compilación.

## Instalar en el iPhone

Abrir la dirección en Safari → Compartir → **Añadir a pantalla de inicio**. Abrirla una vez con wifi para que quede guardada.

| Sin conexión funciona | Necesita conexión |
|---|---|
| Plan, fichas, audioguía, comer, guía, progreso y notas | Mapa 3D (salvo zonas ya vistas), previsión actualizada, Google Maps |

## Estructura

- `index.html`, `css/app.css`, `js/app.js`: la app. JavaScript sin framework ni compilación.
- `js/data.js`: todo el contenido del viaje. Para cambiar una hora, un restaurante o un texto, se edita aquí.
- `sw.js`, `manifest.webmanifest`, `icons/`: instalación y uso sin conexión.
- `vendor/`, `fonts/`: MapLibre GL JS (BSD-3) y tipografías Fraunces e Instrument Sans (OFL), incluidas para no depender de la red.
- `exports/`: KML, GPX y CSV para Google My Maps, y el plan de bolsillo en PDF.
- `tools/build.js`: regenera `exports/`, `bolsillo.html` y los iconos a partir de `js/data.js` (`node tools/build.js`).

## Datos y límites

- Horarios, precios y normas se comprobaron el 12 de noviembre de 2026. Lo marcado «Verificar» puede cambiar.
- Ningún restaurante está reservado.
- Las coordenadas sitúan cada parada a nivel de plaza o puerta. La navegación real se abre en Google Maps por nombre del lugar.
- Las líneas del mapa unen las paradas en orden de visita; no son rutas calle a calle.
- El tiempo viene de Open-Meteo y el mapa de OpenFreeMap (© OpenStreetMap). Ninguno requiere clave.
- El progreso se guarda en cada teléfono por separado; no hay sincronización entre los dos.
