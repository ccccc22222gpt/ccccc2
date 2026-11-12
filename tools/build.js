/* Genera exports/ (KML, GPX, CSV), bolsillo.html e iconos a partir de js/data.js.
   Uso: node tools/build.js   (los iconos necesitan Playwright; si no está, se omiten) */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const window = {}; eval(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8')); const RN = window.RN;
const x = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const day = Object.fromEntries(RN.days.map(d => [d.id, d]));
const pos = s => s.hotel ? [RN.trip.hotel.lng, RN.trip.hotel.lat] : [s.lng, s.lat];
const stops = RN.stops.filter(s => s.lat || s.hotel);
fs.mkdirSync(path.join(root, 'exports'), { recursive: true });

// KML: una carpeta por día + comer
const pm = (name, desc, c) => `<Placemark><name>${x(name)}</name><description>${x(desc)}</description><Point><coordinates>${c[0]},${c[1]},0</coordinates></Point></Placemark>`;
let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Roma Nostra · 13–16 nov 2026</name>`;
RN.days.forEach(d => { const l = stops.filter(s => s.day === d.id); kml += `<Folder><name>${x(d.label)} · ${x(d.title)}</name>` + l.map((s, i) => pm(`${i + 1}. ${s.t} ${s.name}`, s.brief, pos(s))).join('') + `</Folder>`; });
kml += `<Folder><name>Comer</name>` + RN.food.map(f => pm(f.name, `${f.type} · ${f.pp} · ${f.order} · ${f.hours}`, [f.lng, f.lat])).join('') + `</Folder></Document></kml>`;
fs.writeFileSync(path.join(root, 'exports/roma-nostra.kml'), kml);

// GPX por día (puntos y trazo en orden de visita; no es una ruta calle a calle)
[['sab', 'sabado'], ['dom', 'domingo'], ['lun', 'lunes']].forEach(([id, slug]) => {
  const l = stops.filter(s => s.day === id);
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Roma Nostra" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Roma Nostra · ${x(day[id].label)}</name></metadata>` +
    l.map((s, i) => `<wpt lat="${pos(s)[1]}" lon="${pos(s)[0]}"><name>${x(`${i + 1}. ${s.t} ${s.name}`)}</name><desc>${x(s.brief)}</desc></wpt>`).join('') +
    `<rte><name>${x(day[id].title)}</name>` + l.map(s => `<rtept lat="${pos(s)[1]}" lon="${pos(s)[0]}"><name>${x(s.name)}</name></rtept>`).join('') + `</rte></gpx>`;
  fs.writeFileSync(path.join(root, `exports/roma-nostra-${slug}.gpx`), gpx);
});

// CSV para Google My Maps
const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const rows = [['Capa', 'Hora', 'Nombre', 'Latitud', 'Longitud', 'Estado', 'Notas']].concat(
  stops.map(s => [day[s.day].label, s.t, s.name, pos(s)[1], pos(s)[0], s.status, s.brief]),
  RN.food.map(f => ['Comer', '', f.name, f.lat, f.lng, 'PROPUESTA', `${f.type} · ${f.pp} · ${f.order} · ${f.hours}`]));
fs.writeFileSync(path.join(root, 'exports/roma-nostra.csv'), '﻿' + rows.map(r => r.map(q).join(',')).join('\n'));

// Plan de bolsillo: una página estática, imprimible, que funciona sin JavaScript
const pocket = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Roma Nostra · plan de bolsillo</title>
<style>body{font:13px/1.4 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#252521;background:#fff;max-width:760px;margin:0 auto;padding:18px}h1{font:600 26px Georgia,serif;margin:0 0 2px}h2{font:600 17px Georgia,serif;margin:20px 0 6px;padding-top:10px;border-top:2px solid #A5523A;break-after:avoid}table{width:100%;border-collapse:collapse}td{padding:4px 6px 4px 0;vertical-align:top;border-bottom:1px solid #ddd}td:first-child{white-space:nowrap;font-weight:700;font-variant-numeric:tabular-nums;width:46px}.f td{background:#eef0e6}.s{color:#555}.box{border:2px solid #A5523A;padding:10px 12px;margin:10px 0;break-inside:avoid}ul{margin:4px 0;padding-left:18px}@media print{body{padding:0}h2{break-before:auto}}</style></head><body>
<h1>Roma Nostra · plan de bolsillo</h1><p class="s">13–16 de noviembre de 2026 · datos comprobados el ${x(RN.trip.verified)} · las filas sombreadas son horas fijas</p>
<div class="box"><b>Lunes: límites para el vuelo de las 17:00 (Fiumicino)</b><ul><li><b>13:00</b> fuera de los Museos Vaticanos. <b>13:30</b> límite. <b>13:45</b> o más: taxi directo al aeropuerto (55–65 €).</li><li>Metro A Ottaviano → Termini. Leonardo Express: andenes 23–24, 14 €, 32 min, cada 15 min.</li><li>En Fiumicino sobre las <b>14:50</b>. Puerta cerrada a las <b>16:30</b>.</li></ul></div>
<div class="box"><b>Viernes: llegada</b><ul><li>Taxi oficial blanco en la parada exterior. Tarifa fija al interior de las Murallas Aurelianas: 55 €. No aceptar ofertas dentro de la terminal.</li><li>Emergencias: 112.</li></ul></div>` +
  RN.days.map(d => `<h2>${x(d.label)} · ${x(d.title)}</h2><table>` + RN.stops.filter(s => s.day === d.id).map(s => `<tr${s.fixed ? ' class="f"' : ''}><td>${s.t}</td><td><b>${x(s.name)}</b>${s.status === 'PENDIENTE' ? ' · PENDIENTE' : ''}<br><span class="s">${x(s.brief)}${s.warn ? ' <b>' + x(s.warn) + '</b>' : ''}</span></td></tr>`).join('') + `</table><p class="s"><b>Si llueve:</b> ${x(d.rain)}</p>`).join('') +
  `<h2>Comer</h2><table>` + RN.food.map(f => `<tr><td>${x(f.zone)}</td><td><b>${x(f.name)}</b> · ${x(f.addr)}${f.tel ? ' · ' + x(f.tel) : ''}<br><span class="s">${x(f.order)} · ${x(f.pp)} · ${x(f.hours)}</span></td></tr>`).join('') + `</table><p class="s">Ningún restaurante está reservado. Confirmad horarios el mismo día.</p></body></html>`;
fs.writeFileSync(path.join(root, 'bolsillo.html'), pocket);
console.log('exports + bolsillo.html listos:', stops.length, 'paradas,', RN.food.length, 'sitios para comer');

// Iconos
(async () => {
  let pw; try { pw = require('playwright'); } catch (e) { return console.log('Playwright no disponible: iconos sin regenerar'); }
  const svg = n => `<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 512 512"><rect width="512" height="512" fill="#F7F2E9"/><g fill="none" stroke="#252521" stroke-width="16"><path d="M96 396V250a80 80 0 01160 0v146M256 396V250a80 80 0 01160 0v146"/><path d="M136 396V258a40 40 0 0180 0v138M296 396V258a40 40 0 0180 0v138" stroke-width="10" stroke="#8a8578"/></g><path d="M72 396h368" stroke="#A5523A" stroke-width="20"/><path d="M72 128h368" stroke="#A5523A" stroke-width="12"/></svg></body></html>`;
  const b = await pw.chromium.launch();
  for (const [name, n] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const p = await b.newPage({ viewport: { width: n, height: n } }); await p.setContent(svg(n)); await p.screenshot({ path: path.join(root, 'icons', name) }); await p.close();
  }
  const p = await b.newPage(); await p.goto('file://' + path.join(root, 'bolsillo.html')); await p.pdf({ path: path.join(root, 'exports/roma-nostra-bolsillo.pdf'), format: 'A4', margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
  await b.close(); console.log('iconos y PDF de bolsillo listos');
})();
