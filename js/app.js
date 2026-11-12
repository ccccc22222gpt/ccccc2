/* Roma Nostra · lógica de la app. Sin dependencias salvo MapLibre para el mapa. */
(function () {
  'use strict';
  const RN = window.RN, T = RN.trip;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const fmt = m => pad(Math.floor(m / 60) % 24) + ':' + pad(Math.round(m) % 60);
  const byId = Object.fromEntries(RN.stops.map(s => [s.id, s]));
  const foodById = Object.fromEntries(RN.food.map(f => [f.id, f]));
  const dayById = Object.fromEntries(RN.days.map(d => [d.id, d]));

  /* ───── estado guardado en el dispositivo ───── */
  const KEY = 'romanostra.v1';
  const state = Object.assign({ done: {}, skip: {}, shift: {}, notes: {}, musts: {}, prep: {}, hotel: '', size: '', theme: '', rate: 1, wx: null, undo: null, preview: '', tab: 'hoy', planDay: '', zone: 'Todas' }, load());
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin almacenamiento: la app sigue funcionando */ } }
  function applyPrefs() {
    const r = document.documentElement;
    state.size ? r.setAttribute('data-size', state.size) : r.removeAttribute('data-size');
    if (!window.RN_ARTIFACT) state.theme ? r.setAttribute('data-theme', state.theme) : r.removeAttribute('data-theme');
  }

  /* ───── reloj: siempre hora de Roma ───── */
  function romeNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: T.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { date: p.year + '-' + p.month + '-' + p.day, min: (+p.hour) * 60 + (+p.minute) };
  }
  const dayDiff = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 864e5);
  function phase() { const n = romeNow(); return n.date < T.start ? 'antes' : n.date > T.end ? 'despues' : 'viaje'; }
  /* Día activo: el real durante el viaje (la madrugada del sábado sigue siendo "viernes" hasta las 4), o la vista previa elegida */
  function activeDay() {
    if (state.preview) return state.preview;
    const n = romeNow();
    if (phase() !== 'viaje') return '';
    let d = RN.days.find(x => x.date === n.date);
    if (d && n.min < 240) { const prev = RN.days[RN.days.indexOf(d) - 1]; if (prev) d = prev; }
    return d ? d.id : '';
  }
  /* Minutos "ahora" en la escala del día activo; null si es vista previa */
  function nowMin(dayId) {
    if (state.preview) return null;
    const n = romeNow(), d = dayById[dayId];
    if (!d) return null;
    const diff = dayDiff(n.date, d.date);
    return diff === 0 ? n.min : diff === 1 ? n.min + 1440 : null;
  }

  /* ───── paradas ───── */
  const baseMin = s => { const [h, m] = s.t.split(':').map(Number); return h * 60 + m + (h < 5 ? 1440 : 0); };
  const sMin = s => baseMin(s) + ((state.shift[s.day] || {})[s.id] || 0);
  const dayStops = id => RN.stops.filter(s => s.day === id);
  const pending = id => dayStops(id).filter(s => !state.done[s.id] && !state.skip[s.id]);
  const hotelQ = () => state.hotel || T.hotel.q;
  const stopQ = s => s.hotel ? hotelQ() : s.q;
  const gdir = (q, mode) => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q) + '&travelmode=' + (mode || 'walking');
  const gsearch = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  const coords = s => s.hotel ? [T.hotel.lng, T.hotel.lat] : [s.lng, s.lat];

  const ICON = {
    late: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    eat: '<svg viewBox="0 0 24 24"><path d="M7 3v8M4.5 3v5a2.5 2.5 0 005 0V3M7 11v10M17 3c-2 1.5-3 4-3 7h3M17 3v18"/></svg>',
    tired: '<svg viewBox="0 0 24 24"><path d="M4 18v-6a3 3 0 013-3h10a3 3 0 013 3v6M2 18h20M6 9V6h12v3"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v10h14V10"/></svg>',
    plane: '<svg viewBox="0 0 24 24"><path d="M21 15l-8-4V5a1.500 1.500 0 00-3 0v6l-8 4v2l8-2v4l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-4l8 2z"/></svg>',
    rain: '<svg viewBox="0 0 24 24"><path d="M7 15a4 4 0 010-8 5 5 0 019.6 1A3.500 3.500 0 0116.500 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>'
  };
  const pill = st => st ? '<span class="pill ' + esc(st) + '">' + esc(st === 'PROPUESTA' ? 'Propuesta' : st === 'CONFIRMADO' ? 'Confirmado' : st === 'PENDIENTE' ? 'Pendiente' : 'Verificar') + '</span>' : '';

  /* ───── tiempo (Open-Meteo, sin clave) ───── */
  const WX_URL = 'https://api.open-meteo.com/v1/forecast?latitude=41.9028&longitude=12.4964&timezone=Europe%2FRome&start_date=' + T.start + '&end_date=' + T.end +
    '&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset';
  let wxBusy = false;
  function fetchWx(force) {
    if (wxBusy) return; if (!force && state.wx && Date.now() - state.wx.at < 20 * 60e3) return;
    wxBusy = true;
    fetch(WX_URL).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(j => {
      if (!j.daily || !j.hourly) throw 0;
      state.wx = { at: Date.now(), d: j.daily, h: j.hourly }; save(); if (state.tab === 'hoy' || state.tab === 'guia') render();
    }).catch(() => { /* sin red o fuera del rango de previsión: se muestra lo último guardado */ }).finally(() => { wxBusy = false; });
  }
  function wxDay(date) {
    const w = state.wx; if (!w) return null; const i = w.d.time.indexOf(date); if (i < 0 || w.d.temperature_2m_max[i] == null) return null;
    return { code: w.d.weather_code[i], max: w.d.temperature_2m_max[i], min: w.d.temperature_2m_min[i], pp: w.d.precipitation_probability_max[i], wind: w.d.wind_speed_10m_max[i], rise: (w.d.sunrise[i] || '').slice(11, 16), set: (w.d.sunset[i] || '').slice(11, 16) };
  }
  function wxHours(date, from) {
    const w = state.wx; if (!w) return []; const out = [];
    w.h.time.forEach((t, i) => { if (t.slice(0, 10) === date) { const hr = +t.slice(11, 13); if (hr >= from && hr <= 22 && w.h.temperature_2m[i] != null) out.push({ hr, t: w.h.temperature_2m[i], feel: w.h.apparent_temperature[i], pp: w.h.precipitation_probability[i], code: w.h.weather_code[i] }); } });
    return out;
  }
  const wxWord = c => c === 0 ? 'Despejado' : c <= 2 ? 'Poco nuboso' : c === 3 ? 'Nublado' : c <= 48 ? 'Niebla' : c <= 57 ? 'Llovizna' : c <= 67 ? 'Lluvia' : c <= 77 ? 'Nieve' : c <= 82 ? 'Chubascos' : c <= 86 ? 'Nieve' : 'Tormenta';
  function wxIcon(c) {
    const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.400 1.400M17 17l1.400 1.400M5.6 18.400L7 17M17 7l1.400-1.400"/>';
    const cloud = '<path d="M7 17a4 4 0 010-8 5 5 0 019.6 1A3.500 3.500 0 0116.500 17z"/>';
    const rain = '<path d="M7 14a4 4 0 010-8 5 5 0 019.6 1A3.500 3.500 0 0116.500 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3"/>';
    const body = c === 0 ? sun : c <= 2 ? '<circle cx="8" cy="8" r="3"/><path d="M9 19a3.500 3.500 0 010-7 4.500 4.500 0 018.600 1A3 3 0 0117.500 19z"/>' : c <= 48 ? cloud : c >= 95 ? '<path d="M7 13a4 4 0 010-8 5 5 0 019.6 1A3.500 3.500 0 0116.500 13zM12 14l-2 4h3l-2 4"/>' : rain;
    return '<svg class="wx-ico" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  }
  function wear(dayId, w) {
    const out = [];
    if (w) {
      out.push(w.max < 12 ? 'Abrigo, jersey y camiseta: hoy no pasa de ' + Math.round(w.max) + ' °C.' : w.max < 18 ? 'Tres capas: camiseta, jersey fino y chaqueta. Al sol sobra la chaqueta; a la sombra y de noche, no.' : 'Camiseta y chaqueta ligera. Un jersey fino en la mochila para la noche.');
      if (w.min < 8) out.push('Bufanda o pañuelo para primera hora y la vuelta: mínima de ' + Math.round(w.min) + ' °C.');
      if (w.pp >= 60) out.push('Chubasquero o paraguas plegable: lluvia probable (' + w.pp + ' %).');
      else if (w.pp >= 30) out.push('Paraguas plegable en la mochila: ' + w.pp + ' % de probabilidad de lluvia.');
      if (w.wind >= 30) out.push('Algo cortavientos: rachas de hasta ' + Math.round(w.wind) + ' km/h.');
    } else {
      out.push('Noviembre en Roma: entre 9 y 17 °C, y llueve uno de cada tres días. Tres capas y paraguas plegable.');
    }
    if (dayId === 'sab' || dayId === 'lun') out.push('Hombros y rodillas cubiertos: hoy entráis en recinto vaticano.');
    if (dayId === 'dom') out.push('Calzado con buena suela: el Foro es piedra irregular y resbala mojada.');
    if (dayId === 'sab') out.push('Zapatillas ya usadas: son unos 9 km a pie.');
    if (dayId === 'lun') out.push('Ropa cómoda para volar: no hay cambio antes del aeropuerto.');
    return out;
  }
  function wxBlock(dayId) {
    const d = dayById[dayId], w = wxDay(d.date), n = romeNow();
    const from = (!state.preview && n.date === d.date) ? Math.floor(n.min / 60) : 8;
    const hrs = wxHours(d.date, from).filter((x, i) => i % 2 === 0).slice(0, 8);
    let top;
    if (w) {
      top = '<div class="wx-top">' + wxIcon(w.code).replace('wx-ico', 'wx-ico" style="width:40px;height:40px') + '<div class="wx-t">' + Math.round(w.min) + '–' + Math.round(w.max) + '°</div><div class="wx-d"><b>' + wxWord(w.code) + '</b><br><span class="small">Lluvia ' + (w.pp == null ? '–' : w.pp + ' %') + ' · atardece ' + esc(w.set) + '</span></div></div>';
      if (hrs.length) top += '<div class="wx-hours">' + hrs.map(x => '<div class="wx-h"><span>' + pad(x.hr) + 'h</span>' + wxIcon(x.code) + '<b>' + Math.round(x.t) + '°</b><i>' + (x.pp >= 20 ? x.pp + '%' : '&nbsp;') + '</i></div>').join('') + '</div>';
      top += '<div class="small">Previsión de Open-Meteo, actualizada ' + ago(state.wx.at) + '. <button class="lnk" data-act="wx" style="text-decoration:underline">Actualizar</button></div>';
    } else {
      top = '<div class="small">Sin previsión todavía. Se carga sola cuando hay conexión. <button data-act="wx" style="text-decoration:underline">Reintentar</button></div>';
    }
    return '<section class="wx" aria-label="Tiempo y ropa">' + top + '<div class="wear"><span class="eyebrow">Qué ponerse</span><ul>' + wear(dayId, w).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div></section>';
  }
  function ago(ts) { const m = Math.round((Date.now() - ts) / 60e3); return m < 2 ? 'ahora' : m < 60 ? 'hace ' + m + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' días'; }

  /* ───── vistas ───── */
  const view = $('#view');
  function render() {
    document.querySelectorAll('#tabs button').forEach(b => b.dataset.tab === state.tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
    $('#mapwrap').hidden = state.tab !== 'mapa';
    view.hidden = state.tab === 'mapa';
    if (state.tab === 'mapa') { initMap(); return; }
    view.innerHTML = ({ hoy: vHoy, plan: vPlan, comer: vComer, guia: vGuia })[state.tab]();
    tick();
  }

  const ARCHES = '<svg class="arches" viewBox="0 0 600 120" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 118V60a50 50 0 01100 0v58M36 118V64a34 34 0 0168 0v54M170 118V60a50 50 0 01100 0v58M186 118V64a34 34 0 0168 0v54M320 118V60a50 50 0 01100 0v58M336 118V64a34 34 0 0168 0v54M470 118V60a50 50 0 01100 0v58M486 118V64a34 34 0 0168 0v54"/><path class="base" d="M0 118h600M0 6h600" stroke-width="2.500"/></svg>';

  function prepList() {
    return RN.prep.map(p => '<button class="check" role="checkbox" aria-checked="' + !!state.prep[p.id] + '" data-act="prep" data-id="' + p.id + '"><span class="box"></span><span><b>' + esc(p.t) + '</b><span>' + esc(p.why) + '</span></span></button>').join('');
  }
  function previewChips() {
    return '<div class="days">' + RN.days.map(d => '<button data-act="preview" data-id="' + d.id + '" aria-pressed="' + (activeDay() === d.id) + '">' + d.short + '<small>' + d.date.slice(8) + ' nov</small></button>').join('') + '</div>';
  }

  function vHoy() {
    const ph = phase(), dayId = activeDay();
    if (!dayId) {
      const n = romeNow(), left = dayDiff(T.start, n.date), doneN = RN.prep.filter(p => state.prep[p.id]).length;
      if (ph === 'despues') return '<section class="cover"><span class="eyebrow">13–16 de noviembre de 2026</span><h1>Arrivederci, <em>Roma.</em></h1>' + RN.art.svg('cover', 'hero') + '<p class="lede">El viaje ha terminado. Vuestro diario y lo que marcasteis siguen aquí, en la pestaña Guía.</p></section><section class="sec"><span class="eyebrow">Volver a ver un día</span>' + previewChips() + '</section>';
      return '<section class="cover"><span class="eyebrow">13–16 de noviembre · dos viajeros</span><h1>Roma <em>Nostra.</em></h1>' + RN.art.svg('cover', 'hero') +
        '<div class="count"><b>' + (left <= 0 ? 'Hoy' : left) + '</b><span>' + (left === 1 ? 'día para salir. Mañana por la noche dormís en Roma.' : left <= 0 ? 'es el día.' : 'días para salir.') + '</span></div></section>' +
        '<section class="sec"><div class="row" style="justify-content:space-between"><h2>Antes de salir</h2><span class="small num">' + doneN + ' de ' + RN.prep.length + '</span></div><div class="card" style="gap:0;padding-block:4px">' + prepList() + '</div></section>' +
        '<section class="sec"><h2>El tiempo que os espera</h2>' + wx4() + '</section>' +
        '<section class="sec"><h2>Ver un día por dentro</h2><p class="small">Así se verá la pantalla «Hoy» cada jornada. Durante el viaje cambia sola con la hora de Roma.</p>' + previewChips() + '</section>';
    }
    const d = dayById[dayId], all = dayStops(dayId), pend = pending(dayId), nm = nowMin(dayId);
    /* parada actual: la que toca por la hora de Roma; las anteriores sin marcar se ofrecen para cerrar de un toque */
    let ci = 0; if (nm != null) pend.forEach((s, i) => { if (sMin(s) <= nm + 5) ci = i; });
    const cur = pend[ci], nxt = pend[ci + 1], before = pend.slice(0, ci);
    const doneN = all.filter(s => state.done[s.id]).length;
    let h = '<section class="sec" style="gap:6px"><span class="eyebrow t">' + (state.preview ? 'Vista previa · ' : 'Hoy · ') + esc(d.label) + '</span><h1 class="h-day">' + titleEm(d.title) + '</h1><p class="lede">' + esc(d.intro) + '</p>' +
      (state.preview ? '<div class="row"><button class="btn sm" data-act="preview" data-id="">Salir de la vista previa</button></div>' : '') + '</section>';
    h += fixedBanner(dayId, nm);
    if (cur) {
      const t = sMin(cur), rel = nm == null ? '' : nm < t - 1 ? 'Empieza en ' + dur(t - nm) : nm <= t + cur.dur ? 'En curso' : 'Vais ' + dur(nm - t - cur.dur) + ' por detrás del plan';
      h += '<section class="now"><div class="art-band bleed">' + RN.art.stop(cur.id) + '</div><div class="row" style="justify-content:space-between"><span class="eyebrow">' + (nm != null && nm >= t ? 'Ahora' : 'Siguiente') + ' · ' + fmt(t) + '</span>' + pill(cur.status) + '</div><h2>' + esc(cur.name) + '</h2>' +
        (rel ? '<div class="when">' + rel + '</div>' : '') + '<p>' + esc(cur.brief) + '</p><div class="btns">' +
        '<button class="btn pri" data-act="stop" data-id="' + cur.id + '">Ya estamos aquí</button>' +
        '<a class="btn" target="_blank" rel="noopener" href="' + gdir(stopQ(cur), cur.kind === 'logistica' && cur.hotel ? 'transit' : 'walking') + '">Ir ahora</a>' +
        (cur.story ? '<button class="btn" data-act="listen" data-id="' + cur.id + '">Escuchar</button>' : '') +
        '<button class="btn' + (cur.story ? '' : ' wide') + '" data-act="done" data-id="' + cur.id + '">Hecho · siguiente</button></div>' +
        (before.length ? '<div class="small">Sin marcar: ' + before.map(x => esc(x.name)).join(', ') + '. <button data-act="doneprev" data-id="' + cur.id + '" style="text-decoration:underline">Marcar como hechas</button> · <button data-act="stop" data-id="' + before[before.length - 1].id + '" style="text-decoration:underline">Seguimos en la anterior</button></div>' : '') + (nxt ? '<button class="next" data-act="stop" data-id="' + nxt.id + '" style="text-align:left"><span class="num small">' + fmt(sMin(nxt)) + '</span><span>Después: <b>' + esc(nxt.name) + '</b></span></button>' : '') + '</section>';
    } else {
      h += '<section class="now"><span class="eyebrow">Jornada completa</span><h2>Buonanotte.</h2><p>Habéis terminado el plan de hoy.</p><div class="btns"><a class="btn pri wide" target="_blank" rel="noopener" href="' + gdir(hotelQ(), 'transit') + '">Volver al hotel</a></div></section>';
    }
    h += '<div class="prog"><span class="num">' + doneN + ' de ' + all.length + '</span><div class="bar"><i style="width:' + Math.round(doneN / all.length * 100) + '%"></i></div>' + (state.undo && state.undo.day === dayId ? '<button data-act="undo" style="text-decoration:underline">Deshacer cambio</button>' : '') + '</div>';
    h += '<section class="quick">' +
      '<button class="btn" data-act="late">' + ICON.late + 'Vamos tarde</button>' +
      '<button class="btn" data-act="hungry">' + ICON.eat + 'Tenemos hambre</button>' +
      '<button class="btn" data-act="tired">' + ICON.tired + 'Estamos cansados</button>' +
      '<button class="btn" data-act="rain">' + ICON.rain + 'Si llueve</button>' +
      '<a class="btn" target="_blank" rel="noopener" href="' + gdir(hotelQ(), 'transit') + '">' + ICON.home + 'Volver al hotel</a>' +
      '<button class="btn" data-act="airport">' + ICON.plane + 'Aeropuerto</button></section>';
    h += wxBlock(dayId);
    return h;
  }
  const titleEm = t => { const i = t.lastIndexOf(' '); return i < 0 ? esc(t) : esc(t.slice(0, i)) + ' <em>' + esc(t.slice(i + 1)) + '</em>'; };
  const dur = m => { m = Math.max(0, Math.round(m)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60 ? pad(m % 60) + ' min' : ''); };

  function fixedBanner(dayId, nm) {
    const fx = pending(dayId).filter(s => (s.fixed && s.kind !== 'logistica' || (s.fixed && dayId === 'lun')) && (nm == null || sMin(s) >= nm - 10))[0];
    if (!fx) return '';
    const t = sMin(fx), lead = fx.lead || 0, left = nm == null ? null : t - lead - nm;
    const alert = left != null && left < 45;
    return '<button class="fixed' + (alert ? ' alert' : '') + '" data-act="stop" data-id="' + fx.id + '" style="text-align:left"><span class="big">' + fmt(t) + '</span><span><b>' + esc(fx.name) + '</b><br><span class="small" data-countdown="' + (t - lead) + '" data-day="' + dayId + '">' + (lead ? 'Estad en la puerta a las ' + fmt(t - lead) + '. ' : '') + (left == null ? 'Hora fija: no se mueve.' : left > 0 ? 'Faltan ' + dur(left) + '.' : 'Es ahora.') + '</span></span></button>';
  }

  function wx4() {
    if (!state.wx) return '<div class="wx"><div class="small">La previsión se carga sola cuando hay conexión. <button data-act="wx" style="text-decoration:underline">Reintentar</button></div><div class="wear"><ul><li>' + esc(wear('', null)[0]) + '</li></ul></div></div>';
    return '<div class="wx"><div class="wx-hours" style="grid-auto-columns:1fr">' + RN.days.map(d => { const w = wxDay(d.date); return w ? '<div class="wx-h"><span>' + d.short + ' ' + d.date.slice(8) + '</span>' + wxIcon(w.code) + '<b>' + Math.round(w.min) + '–' + Math.round(w.max) + '°</b><i>' + (w.pp >= 20 ? w.pp + '%' : '&nbsp;') + '</i></div>' : '<div class="wx-h"><span>' + d.short + '</span><b>–</b></div>'; }).join('') + '</div><div class="small">Mín–máx y probabilidad de lluvia. Open-Meteo, actualizado ' + ago(state.wx.at) + '. <button data-act="wx" style="text-decoration:underline">Actualizar</button></div></div>';
  }

  function stopRow(s, curId) {
    const t = sMin(s), sh = (state.shift[s.day] || {})[s.id];
    const cls = ['stop', state.done[s.id] ? 'done' : '', state.skip[s.id] ? 'skip' : '', s.fixed ? 'fixed-stop' : '', s.id === curId ? 'cur' : ''].join(' ');
    return '<button class="' + cls + '" data-act="stop" data-id="' + s.id + '" style="--day:' + dayById[s.day].color + '"><span class="tm num">' + fmt(t) + (sh ? '<s>' + fmt(baseMin(s)) + '</s>' : '') + '</span><span class="rail"><span class="dot"></span></span><span class="body"><span class="nm">' + esc(s.name) + '</span><span class="br">' + esc(s.brief) + '</span><span class="tags">' +
      (s.fixed && s.status === 'CONFIRMADO' ? '<span class="pill CONFIRMADO">Hora fija</span>' : s.status === 'PENDIENTE' ? pill('PENDIENTE') : '') + (s.optional ? '<span class="pill">Opcional</span>' : '') + (s.audio ? '<span class="pill">Audio</span>' : '') + (state.skip[s.id] ? '<span class="pill">Saltada</span>' : '') + '</span></span></button>';
  }
  function vPlan() {
    const dayId = state.planDay || activeDay() || 'sab', d = dayById[dayId], nmP = nowMin(dayId); let cur = pending(dayId)[0]; if (nmP != null) pending(dayId).forEach(x => { if (sMin(x) <= nmP + 5) cur = x; });
    return '<div class="days">' + RN.days.map(x => '<button data-act="planday" data-id="' + x.id + '" aria-pressed="' + (x.id === dayId) + '">' + x.short + '<small>' + x.date.slice(8) + ' nov</small></button>').join('') + '</div>' +
      '<section class="sec" style="gap:6px"><span class="eyebrow t">' + esc(d.label) + '</span><h1 class="h-day">' + titleEm(d.title) + '</h1><p class="lede">' + esc(d.intro) + '</p></section><div class="art-band">' + RN.art.day(dayId) + '</div>' +
      '<section class="tl">' + dayStops(dayId).map(s => stopRow(s, cur && cur.id)).join('') + '</section>' +
      '<section class="card"><span class="eyebrow">Si llueve</span><p>' + esc(d.rain) + '</p></section>' +
      '<div class="btns"><button class="btn" data-act="mapday" data-id="' + dayId + '">Ver en el mapa</button><button class="btn" data-act="resetday" data-id="' + dayId + '">Reiniciar el día</button></div>' +
      '<p class="small">El rombo marca una hora fija. Las demás horas son una propuesta: tocad cualquier parada para ver su ficha.</p>';
  }

  function foodCard(f) {
    return '<button class="card" data-act="food" data-id="' + f.id + '" style="text-align:left"><div class="row" style="justify-content:space-between"><span class="eyebrow">' + esc(f.type) + ' · ' + esc(f.zone) + '</span><span class="small num">' + esc(f.pp) + '</span></div><h3>' + esc(f.name) + '</h3><p class="small" style="color:var(--ink)">' + esc(f.order) + '</p><p class="small">' + esc(f.when) + ' · ' + esc(f.hours) + '</p></button>';
  }
  function vComer() {
    const zones = ['Todas'].concat([...new Set(RN.food.map(f => f.zone))]), z = state.zone;
    const list = RN.food.filter(f => z === 'Todas' || f.zone === z), got = RN.musts.filter(m => state.musts[m.id]).length;
    return '<section class="sec" style="gap:6px"><span class="eyebrow t">Comer en Roma</span><h1 class="h-day">Dónde, qué y <em>cuándo</em></h1><p class="lede">Ningún sitio está reservado. Los horarios se comprobaron el ' + esc(T.verified) + ' y cambian: llamad o mirad la web el mismo día.</p></section>' +
      '<section class="sec"><div class="row" style="justify-content:space-between"><h2>Hay que probarlo</h2><span class="small num">' + got + ' de ' + RN.musts.length + '</span></div><div class="card" style="gap:0;padding-block:4px">' +
      RN.musts.map(m => '<button class="check" role="checkbox" aria-checked="' + !!state.musts[m.id] + '" data-act="must" data-id="' + m.id + '"><span class="box"></span><span><b>' + esc(m.name) + '</b><span>' + esc(m.note) + '</span></span></button>').join('') + '</div></section>' +
      '<section class="sec"><h2>Sitios elegidos</h2><div class="chips">' + zones.map(x => '<button class="chip" data-act="zone" data-id="' + esc(x) + '" aria-pressed="' + (x === z) + '">' + esc(x) + '</button>').join('') + '</div>' + list.map(foodCard).join('') + '</section>' +
      '<section class="card"><span class="eyebrow">Cómo reconocer una trampa</span><p>Fotos de los platos en la puerta, un camarero que os llama desde la acera, carta en seis idiomas, «menú turístico» y mesas en la plaza más famosa. Dos calles más allá se come mejor.</p></section>';
  }

  function vGuia() {
    const fx = RN.stops.filter(s => s.status === 'CONFIRMADO' && s.fixed || s.status === 'PENDIENTE');
    const notes = Object.keys(state.notes).filter(k => state.notes[k]);
    const acc = (t, body, open) => '<details' + (open ? ' open' : '') + '><summary>' + t + '</summary><div class="in">' + body + '</div></details>';
    return '<section class="sec" style="gap:6px"><span class="eyebrow t">Guía práctica</span><h1 class="h-day">Todo lo <em>demás</em></h1></section><div>' +
      acc('Antes de salir', '<div>' + prepList() + '</div>', phase() === 'antes') +
      acc('Reservas y pendientes', fx.map(s => '<button class="eat" data-act="stop" data-id="' + s.id + '"><span class="row">' + pill(s.status) + '<span class="small num">' + esc(dayById[s.day].label) + ' · ' + s.t + '</span></span><b>' + esc(s.name) + '</b><span>' + esc(s.cost || s.brief) + '</span></button>').join('') + '<p class="small">Los códigos QR no están en esta app: guardadlos como capturas en Fotos.</p>') +
      acc('Llegada y vuelta al aeropuerto', '<p><b>Viernes, llegada.</b> ' + esc(byId.v2.brief) + '</p><p class="small">' + esc(byId.v2.tip) + '</p><p class="small">' + esc(byId.v2.alt) + '</p><p><b>Lunes, vuelta.</b> Fuera del Vaticano a las 13:00 → metro A hasta Termini → Leonardo Express (14 €, 32 min, cada 15 min) → Fiumicino sobre las 14:50. En la puerta de embarque a las 16:15.</p><p class="small">' + esc(byId.l5.tip) + '</p><div class="btns"><button class="btn wide" data-act="airport">Abrir plan de aeropuerto</button></div>') +
      acc('Tiempo y ropa', wx4() + RN.days.slice(1).map(d => '<div><span class="eyebrow">' + esc(d.label) + '</span><ul>' + wear(d.id, wxDay(d.date)).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>').join('')) +
      RN.practical.map(p => acc(esc(p.h), '<ul>' + p.items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>')).join('') +
      acc('Italiano de supervivencia', '<div class="phr">' + RN.phrases.map(p => '<div><b>' + esc(p[0]) + '</b><span>' + esc(p[1]) + '</span></div>').join('') + '</div>') +
      acc('Diario del viaje', (notes.length ? notes.map(k => '<div><span class="eyebrow">' + esc(byId[k] ? byId[k].name : k) + '</span><p>' + esc(state.notes[k]) + '</p></div>').join('') : '<p class="small">Aún no hay notas. Se escriben al final de cada ficha.</p>') + '<label for="n-dia">Nuestro hallazgo del viaje</label><textarea id="n-dia" data-note="_viaje">' + esc(state.notes._viaje || '') + '</textarea><div class="btns"><button class="btn wide" data-act="export">Exportar diario y progreso</button></div>') +
      acc('Mapas para Google Maps', '<p>Cada parada abre Google Maps con «Ir ahora». Si queréis todas las paradas en vuestro propio mapa, importad estos archivos en Google My Maps (desde un ordenador: mymaps.google.com → Crear mapa → Importar).</p><div class="btns"><a class="btn" href="exports/roma-nostra.kml" download>KML completo</a><a class="btn" href="exports/roma-nostra.csv" download>CSV</a><a class="btn" href="exports/roma-nostra-sabado.gpx" download>GPX sábado</a><a class="btn" href="exports/roma-nostra-domingo.gpx" download>GPX domingo</a><a class="btn" href="exports/roma-nostra-lunes.gpx" download>GPX lunes</a><a class="btn" href="bolsillo.html" target="_blank" rel="noopener">Plan de bolsillo</a><a class="btn wide" href="exports/roma-nostra-bolsillo.pdf" target="_blank" rel="noopener">Plan de bolsillo en PDF (guardadlo en Archivos)</a></div>') +
      acc('Qué he cambiado del plan anterior', RN.audit.map(a => '<div><span class="eyebrow">' + esc(a[0]) + '</span><p>' + esc(a[1]) + '</p></div>').join('')) +
      acc('Instalar en el iPhone y uso sin conexión', '<ul><li>Abrid esta página en Safari, pulsad Compartir y «Añadir a pantalla de inicio».</li><li>Abridla una vez con wifi: quedan guardados textos, fichas, plan y progreso.</li><li>Sin conexión funcionan: plan, fichas, audioguía (con la voz del teléfono), comer, guía y vuestro progreso.</li><li>Necesitan conexión: el mapa 3D (salvo las zonas ya vistas), el tiempo actualizado y Google Maps.</li><li>El progreso se guarda en cada teléfono por separado.</li></ul>') +
      acc('Ajustes', '<label for="hotel">Dirección exacta del alojamiento (solo se guarda en este teléfono)</label><input type="text" id="hotel" value="' + esc(state.hotel) + '" placeholder="Calle y número, Roma" autocomplete="off"><span class="eyebrow">Tamaño del texto</span><div class="chips">' + [['', 'Normal'], ['l', 'Grande'], ['xl', 'Muy grande']].map(x => '<button class="chip" data-act="size" data-id="' + x[0] + '" aria-pressed="' + (state.size === x[0]) + '">' + x[1] + '</button>').join('') + '</div><span class="eyebrow">Aspecto</span><div class="chips">' + [['', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(x => '<button class="chip" data-act="theme" data-id="' + x[0] + '" aria-pressed="' + (state.theme === x[0]) + '">' + x[1] + '</button>').join('') + '</div><div class="btns"><button class="btn wide" data-act="resetall">Borrar todo el progreso</button></div>') +
      acc('Fuentes y fecha de los datos', '<p class="small">Horarios, precios y normas comprobados el ' + esc(T.verified) + '. Todo lo marcado «Verificar» puede cambiar: confirmadlo en la fuente el mismo día.</p><ul>' + RN.sources.map(s => '<li><a href="' + esc(s[1]) + '" target="_blank" rel="noopener">' + esc(s[0]) + '</a></li>').join('') + '</ul><p class="small">Mapa: © OpenStreetMap, OpenMapTiles y OpenFreeMap. Tipografías Fraunces e Instrument Sans (licencia OFL).</p>') + '</div>';
  }

  /* ───── fichas ───── */
  const sheet = $('#sheet'), sbody = $('#sheet-body');
  function openSheet(html) { sbody.innerHTML = html; sheet.hidden = false; $('.sheet-card').scrollTop = 0; document.body.style.overflow = 'hidden'; }
  function closeSheet() { stopAudio(); sheet.hidden = true; document.body.style.overflow = ''; }
  const blk = (t, body) => body ? '<div class="blk"><h3>' + t + '</h3>' + body + '</div>' : '';
  const paras = t => t.replace(/([.!?»]) (?=[A-ZÁÉÍÓÚÑ¿¡«])/g, '$1\n').split('\n').reduce((a, s) => { const l = a[a.length - 1]; if (l && l.length < 330) a[a.length - 1] = l + ' ' + s; else a.push(s); return a; }, []).map(p => '<p>' + esc(p) + '</p>').join('');

  function stopSheet(id) {
    const s = byId[id], d = dayById[s.day], t = sMin(s);
    const eat = (s.eat || []).map(k => foodById[k]).filter(Boolean);
    openSheet('<div class="art-band">' + RN.art.stop(s.id) + '</div><div class="blk" style="gap:8px"><div class="row"><span class="eyebrow t">' + esc(d.label) + ' · ' + fmt(t) + (s.dur ? '–' + fmt(t + s.dur) : '') + '</span>' + pill(s.status) + '</div><h2 id="sheet-title">' + esc(s.name) + '</h2><p>' + esc(s.brief) + '</p>' + (s.cost ? '<p class="small">' + esc(s.cost) + '</p>' : '') + '</div>' +
      (s.warn ? '<div class="warn"><b>Atención.</b> ' + esc(s.warn) + '</div>' : '') +
      '<div class="btns"><a class="btn pri" target="_blank" rel="noopener" href="' + gdir(stopQ(s), 'walking') + '">Ir ahora</a>' + (s.lat || s.hotel ? '<button class="btn" data-act="fly" data-id="' + s.id + '">Ver en 3D</button>' : '') + '</div>' +
      (s.story ? '<div class="audio"><button class="btn sm dark" data-act="play" data-id="' + s.id + '">▶ Escuchar</button><button class="btn sm" data-act="pause">Pausa</button><button class="btn sm" data-act="stopaudio">Parar</button><button class="btn sm" data-act="rate">Velocidad ' + state.rate + '×</button><span class="small" id="audio-st">Voz del teléfono. ' + Math.max(1, Math.round(s.story.split(' ').length / 150)) + ' min.</span></div>' : '') +
      blk('Qué mirar', s.look ? '<ol>' + s.look.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>' : '') +
      blk('La historia', s.story ? '<div class="story">' + paras(s.story) + '</div>' : '') +
      blk('Dato', s.fact ? '<p>' + esc(s.fact) + '</p>' : '') +
      blk('La foto', s.photo ? '<p>' + esc(s.photo) + '</p>' : '') +
      blk('Consejo', s.tip ? '<p>' + esc(s.tip) + '</p>' : '') +
      blk('Si no tenéis tiempo', s.short ? '<p>' + esc(s.short) + '</p>' : '') +
      blk('Plan B', s.alt ? '<p>' + esc(s.alt) + '</p>' : '') +
      blk('Comer cerca', eat.length ? '<div>' + eat.map(f => '<button class="eat" data-act="food" data-id="' + f.id + '"><b>' + esc(f.name) + '</b><span>' + esc(f.type) + ' · ' + esc(f.pp) + ' · ' + esc(f.order) + '</span></button>').join('') + '</div>' : '') +
      '<div class="blk"><h3>Nuestra nota</h3><textarea data-note="' + s.id + '" placeholder="Algo que queráis recordar de aquí" aria-label="Nota de esta parada">' + esc(state.notes[s.id] || '') + '</textarea></div>' +
      '<div class="btns"><button class="btn dark" data-act="done" data-id="' + s.id + '">' + (state.done[s.id] ? 'Marcar como no visitada' : 'Hecho') + '</button>' + (s.fixed && s.status === 'CONFIRMADO' ? '<span class="btn" style="border-style:dashed;color:var(--muted)">Reserva fija</span>' : '<button class="btn" data-act="skip" data-id="' + s.id + '">' + (state.skip[s.id] ? 'Recuperar parada' : 'Saltar') + '</button>') + '</div>');
  }
  function foodSheet(id) {
    const f = foodById[id];
    openSheet('<div class="art-band">' + RN.art.food(f.type) + '</div><div class="blk" style="gap:8px"><div class="row"><span class="eyebrow t">' + esc(f.type) + ' · ' + esc(f.zone) + '</span><span class="pill">Sin reserva hecha</span></div><h2 id="sheet-title">' + esc(f.name) + '</h2><p>' + esc(f.why) + '</p></div>' +
      (f.but ? '<div class="warn"><b>A tener en cuenta.</b> ' + esc(f.but) + '</div>' : '') +
      '<dl class="kv"><dt>Pedid</dt><dd>' + esc(f.order) + '</dd><dt>Precio</dt><dd>' + esc(f.pp) + ' por persona, orientativo</dd><dt>Horario</dt><dd>' + esc(f.hours) + '</dd><dt>Reserva</dt><dd>' + esc(f.reserve) + '</dd><dt>Dirección</dt><dd>' + esc(f.addr) + '</dd>' + (f.tel ? '<dt>Teléfono</dt><dd><a href="tel:' + f.tel.replace(/\s/g, '') + '">' + esc(f.tel) + '</a></dd>' : '') + '<dt>Encaja</dt><dd>' + esc(f.when) + '</dd></dl>' +
      '<p class="small">Horario comprobado el ' + esc(T.verified) + '. Confirmadlo el mismo día.</p>' +
      '<div class="btns"><a class="btn pri" target="_blank" rel="noopener" href="' + gdir(f.name + ', ' + f.addr + ', Roma') + '">Ir ahora</a>' + (f.url ? '<a class="btn" target="_blank" rel="noopener" href="' + esc(f.url) + '">Web</a>' : '<a class="btn" target="_blank" rel="noopener" href="' + gsearch(f.name + ' ' + f.addr + ' Roma') + '">Ver en Maps</a>') + '</div>');
  }

  /* ───── replanificar ───── */
  function simulate(dayId, delay, dropped) {
    const list = pending(dayId).filter(s => !dropped.includes(s.id)), shifts = {}, late = [];
    let off = delay;
    list.forEach((s, i) => {
      const hard = s.fixed || s.light;
      if (hard) { if (off > (s.light ? 15 : 0)) late.push({ s, by: off }); off = s.light ? Math.min(off, 15) : 0; if (s.light && off) shifts[s.id] = off; }
      else if (off) shifts[s.id] = off;
      const nx = list[i + 1];
      if (nx) { const gap = baseMin(nx) - (baseMin(s) + s.dur); off = Math.max(0, off - Math.max(0, gap - 10)); }
    });
    return { shifts, late, list };
  }
  function replan(dayId, delay) {
    const dropped = []; let r = simulate(dayId, delay, dropped), guard = 0;
    while (r.late.length && guard++ < 12) {
      const target = r.late[0].s, idx = r.list.indexOf(target);
      const cands = r.list.slice(0, idx).filter(s => !s.fixed && !s.light && s.p >= 2 && s.kind !== 'comida').sort((a, b) => b.p - a.p || baseMin(b) - baseMin(a));
      if (!cands.length) break;
      dropped.push(cands[0].id);
      /* al quitar una parada, su hueco absorbe retraso */
      r = simulate(dayId, delay, dropped);
    }
    return { dropped, shifts: r.shifts, late: r.late };
  }
  function lateSheet() {
    const dayId = activeDay(); if (!dayId) return toast('Elegid primero un día');
    openSheet('<div class="blk"><span class="eyebrow t">Cambiar el plan</span><h2 id="sheet-title">¿Cuánto retraso lleváis?</h2><p>Muevo las paradas libres y, si hace falta, quito las prescindibles. Las reservas no se tocan nunca.</p></div><div class="btns">' + [15, 30, 45, 60].map(m => '<button class="btn" data-act="lateapply" data-id="' + m + '">' + m + ' minutos</button>').join('') + '</div>');
  }
  function lateApply(delay) {
    const dayId = activeDay(), r = replan(dayId, delay);
    state.undo = { day: dayId, shift: JSON.stringify(state.shift[dayId] || {}), skip: r.dropped.slice() };
    const prev = state.shift[dayId] || {}, merged = {};
    pending(dayId).forEach(s => { const v = (prev[s.id] || 0) + (r.shifts[s.id] || 0); if (v) merged[s.id] = v; });
    state.shift[dayId] = merged; r.dropped.forEach(id => { state.skip[id] = true; }); save(); render();
    const keep = dayStops(dayId).filter(s => s.fixed && !state.done[s.id]);
    openSheet('<div class="blk"><span class="eyebrow t">Plan ajustado · +' + delay + ' min</span><h2 id="sheet-title">Esto es lo que cambia</h2></div>' +
      blk('Mantengo', '<p>' + (keep.length ? keep.map(s => esc(s.name) + ' a las ' + s.t).join(' · ') : 'El orden del paseo.') + '</p>') +
      blk('Quito', r.dropped.length ? '<ul>' + r.dropped.map(id => '<li>' + esc(byId[id].name) + (byId[id].short ? '. ' + esc(byId[id].short) : '') + '</li>').join('') + '</ul>' : '<p>Nada. El retraso se absorbe con las holguras del plan.</p>') +
      blk('Nuevas horas', '<ul>' + pending(dayId).slice(0, 6).map(s => '<li><span class="num">' + fmt(sMin(s)) + '</span> ' + esc(s.name) + '</li>').join('') + '</ul>') +
      (r.late.length ? '<div class="warn"><b>Aun así vais justos.</b> Para llegar a «' + esc(r.late[0].s.name) + '» os faltarían unos ' + r.late[0].by + ' min. Acortad la parada actual y coged un taxi para ese tramo.</div>' : '') +
      '<div class="btns"><button class="btn pri" data-close>De acuerdo</button><button class="btn" data-act="undo">Deshacer</button></div>');
  }
  function undo() {
    const u = state.undo; if (!u) return;
    state.shift[u.day] = JSON.parse(u.shift); u.skip.forEach(id => { delete state.skip[id]; }); state.undo = null; save(); closeSheet(); render(); toast('Plan original recuperado');
  }
  function tiredSheet() {
    const dayId = activeDay(); if (!dayId) return toast('Elegid primero un día');
    const pend = pending(dayId), cut = pend.filter(s => !s.fixed && (s.optional || s.p === 3 || (s.p === 2 && s.kind === 'paseo'))), keep = pend.filter(s => !cut.includes(s));
    openSheet('<div class="blk"><span class="eyebrow t">Versión corta</span><h2 id="sheet-title">Bajamos el ritmo</h2><p>Sentaos veinte minutos con un café. Roma lleva aquí 2.700 años: no se va a mover.</p></div>' +
      blk('Me quedaría con', '<ul>' + keep.map(s => '<li><span class="num">' + fmt(sMin(s)) + '</span> ' + esc(s.name) + (s.short ? '<br><span class="small">' + esc(s.short) + '</span>' : '') + '</li>').join('') + '</ul>') +
      blk('Quitaría', cut.length ? '<ul>' + cut.map(s => '<li>' + esc(s.name) + '</li>').join('') + '</ul>' : '<p>No queda nada prescindible: lo que falta son reservas o comidas.</p>') +
      blk('Para moverse sin andar', '<p>Taxi por app (FreeNow o itTaxi) o en parada: dentro del centro, entre 8 y 15 €. El metro solo compensa en trayectos largos.</p>') +
      '<div class="btns">' + (cut.length ? '<button class="btn pri" data-act="tiredapply">Aplicar versión corta</button>' : '') + '<a class="btn" target="_blank" rel="noopener" href="' + gdir(hotelQ(), 'transit') + '">Volver al hotel</a></div>');
  }
  function tiredApply() {
    const dayId = activeDay(), pend = pending(dayId), cut = pend.filter(s => !s.fixed && (s.optional || s.p === 3 || (s.p === 2 && s.kind === 'paseo')));
    state.undo = { day: dayId, shift: JSON.stringify(state.shift[dayId] || {}), skip: cut.map(s => s.id) };
    cut.forEach(s => { state.skip[s.id] = true; }); save(); closeSheet(); render(); toast('Versión corta aplicada');
  }
  function hungrySheet() {
    const dayId = activeDay() || 'sab', pend = pending(dayId), all = dayStops(dayId);
    let ids = []; const from = pend[0] ? all.indexOf(pend[0]) : all.length - 1;
    for (let k = 0; k < all.length && ids.length < 5; k++) { [from + k, from - k].forEach(i => { if (all[i] && all[i].eat) all[i].eat.forEach(e => { if (!ids.includes(e)) ids.push(e); }); }); }
    const list = ids.slice(0, 6).map(k => foodById[k]).filter(Boolean), quick = list.filter(f => f.type === 'Rápido' || f.type === 'Vinería' || f.type === 'Pizzería');
    openSheet('<div class="blk"><span class="eyebrow t">Tenemos hambre</span><h2 id="sheet-title">Cerca de ' + esc(pend[0] ? pend[0].name : 'aquí') + '</h2><p>Ordenados por cercanía a vuestra parada. Ninguno está reservado: mirad el horario antes de ir.</p></div>' +
      (quick.length ? blk('Lo más rápido', '<div>' + quick.map(f => '<button class="eat" data-act="food" data-id="' + f.id + '"><b>' + esc(f.name) + '</b><span>' + esc(f.pp) + ' · ' + esc(f.order) + '</span></button>').join('') + '</div>') : '') +
      blk('Todas las opciones', '<div>' + list.map(f => '<button class="eat" data-act="food" data-id="' + f.id + '"><b>' + esc(f.name) + '</b><span>' + esc(f.type) + ' · ' + esc(f.pp) + ' · ' + esc(f.hours) + '</span></button>').join('') + '</div>') +
      '<div class="btns"><button class="btn wide" data-act="tab" data-id="comer">Ver todos los sitios</button></div>');
  }
  function rainSheet() {
    const d = dayById[activeDay() || 'sab'], w = wxDay(d.date);
    openSheet('<div class="blk"><span class="eyebrow t">Si llueve · ' + esc(d.label) + '</span><h2 id="sheet-title">Plan con paraguas</h2>' + (w ? '<p class="small">Probabilidad de lluvia hoy: ' + w.pp + ' %.</p>' : '') + '<p>' + esc(d.rain) + '</p></div>' +
      blk('Refugios que siempre funcionan', '<ul><li>Panteón: ver llover por el óculo es de lo mejor que puede pasaros.</li><li>Sant’Ignazio y cualquier iglesia abierta: son gratis.</li><li>Un café histórico: Sant’Eustachio o Tazza d’Oro.</li><li>Galleria Alberto Sordi, en Via del Corso: pasaje cubierto.</li></ul>') +
      blk('Ojo', '<p>El empedrado («sampietrini») resbala mucho mojado. Los vendedores de paraguas aparecen en cuanto caen dos gotas: 5 € es el precio, no 10.</p>'));
  }
  function airportSheet() {
    const n = romeNow(), isMon = n.date === dayById.lun.date && !state.preview, steps = ['l4', 'l5', 'l6', 'l7', 'l8'].map(k => byId[k]);
    openSheet('<div class="blk"><span class="eyebrow t">Lunes 16 · vuelo 17:00 desde Fiumicino</span><h2 id="sheet-title">Plan de aeropuerto</h2><p>Con este horario llegáis dos horas antes del vuelo. Estos son los límites que no conviene pasar.</p></div>' +
      '<div class="fixed' + (isMon && n.min > 13 * 60 + 15 ? ' alert' : '') + '"><span class="big">13:00</span><span><b>Fuera de los Museos Vaticanos</b><br><span class="small">' + (isMon ? (n.min < 780 ? 'Faltan ' + dur(780 - n.min) + '.' : 'Ya deberíais estar de camino.') : 'A las 13:30, límite. A las 13:45, taxi directo.') + '</span></span></div>' +
      blk('Paso a paso', '<ol>' + steps.map(s => '<li><b class="num">' + s.t + '</b> ' + esc(s.name) + '<br><span class="small">' + esc(s.brief) + '</span></li>').join('') + '</ol>') +
      blk('Si algo falla', '<ul><li><b>Metro A cortado:</b> taxi a Termini (15 min, unos 15 €) o directo a Fiumicino.</li><li><b>Leonardo Express con retraso:</b> el siguiente sale a los 15 min. Si hay avería, taxi desde Termini: tarifa fija 55 €, 45 min.</li><li><b>Salís tarde del Vaticano (13:45 o más):</b> taxi directo a Fiumicino desde Viale Vaticano, unos 55–65 €.</li><li><b>Mochilas en el guardarropa:</b> se recogen en el vestíbulo de entrada, antes de salir a la calle.</li></ul>') +
      '<div class="btns"><a class="btn pri" target="_blank" rel="noopener" href="' + gdir('Aeroporto di Roma Fiumicino', 'transit') + '">Ruta a Fiumicino</a><a class="btn" target="_blank" rel="noopener" href="https://www.trenitalia.com/it/regionale/collegamenti-regionale/leonardo-express.html">Horarios del tren</a></div>');
  }

  /* ───── audioguía con la voz del dispositivo ───── */
  const synth = window.speechSynthesis; let queue = [], speaking = false;
  function voice() { const v = synth ? synth.getVoices() : []; return v.find(x => /^es[-_]ES/i.test(x.lang) && /m[oó]nica|marisol|paulina|google|premium|enhanced/i.test(x.name)) || v.find(x => /^es[-_]ES/i.test(x.lang)) || v.find(x => /^es/i.test(x.lang)) || null; }
  function setSt(t) { const e = $('#audio-st'); if (e) e.textContent = t; }
  function play(id) {
    if (!synth || !window.SpeechSynthesisUtterance) return setSt('Este navegador no tiene voz. Leed el texto de abajo.');
    const s = byId[id]; stopAudio();
    queue = (s.name + '. ' + s.story).match(/[^.!?]+[.!?»]*/g) || [s.story]; speaking = true; setSt('Reproduciendo…'); next();
  }
  function next() {
    if (!speaking) return; const t = queue.shift(); if (!t) { speaking = false; return setSt('Fin de la narración.'); }
    const u = new SpeechSynthesisUtterance(t.trim()); const v = voice(); if (v) u.voice = v; u.lang = v ? v.lang : 'es-ES'; u.rate = state.rate; u.onend = next; u.onerror = () => { speaking = false; setSt('La voz se ha detenido.'); }; synth.speak(u);
  }
  function stopAudio() { speaking = false; queue = []; if (synth) synth.cancel(); }
  if (synth && synth.getVoices) synth.getVoices();

  /* ───── mapa 3D ───── */
  let map, mapReady = false, markers = [], mapDay = '', showFood = false, flat = false, pendingFly = null, orbit = null;
  function initMap() {
    renderMapbar();
    if (map) { map.resize(); drawMap(); return; }
    if (!window.maplibregl) { mapFail(); return; }
    try {
      map = new maplibregl.Map({ container: 'map', style: 'https://tiles.openfreemap.org/styles/liberty', center: T.center, zoom: 13.6, pitch: 58, bearing: -18, attributionControl: { compact: true }, maxPitch: 75 });
    } catch (e) { map = null; return mapFail(); }
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'bottom-right');
    let failed = false;
    map.on('error', e => { if (!mapReady && !failed) { failed = true; mapFail(); } void e; });
    map.on('load', () => {
      mapReady = true; $('#mapnote').hidden = true;
      const layers = map.getStyle().layers || [];
      if (!layers.some(l => l.type === 'fill-extrusion')) {
        const src = Object.keys(map.getStyle().sources).find(k => map.getStyle().sources[k].type === 'vector');
        if (src) try { map.addLayer({ id: 'rn-3d', type: 'fill-extrusion', source: src, 'source-layer': 'building', minzoom: 14, paint: { 'fill-extrusion-color': '#d9cfbe', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 12], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': .85 } }); } catch (e) { /* estilo sin edificios */ }
      }
      map.addSource('rn-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'rn-route', type: 'line', source: 'rn-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 3.500, 'line-dasharray': [1, 1.600], 'line-opacity': .9 } });
      drawMap(); if (pendingFly) { flyTo(pendingFly); pendingFly = null; }
    });
    map.on('dragstart', () => { if (orbit) { cancelAnimationFrame(orbit); orbit = null; } });
  }
  function mapFail() {
    const n = $('#mapnote'); n.hidden = false;
    if (window.RN_ARTIFACT) { n.innerHTML = '<b>El mapa 3D no está en esta vista previa.</b><span class="small">Funciona en la versión instalada desde GitHub Pages. Aquí, cada parada abre Google Maps con «Ir ahora».</span><div class="btns"><button class="btn sm wide" data-act="tab" data-id="plan">Ir al plan</button></div>'; return; }
    n.innerHTML = '<b>El mapa 3D necesita conexión.</b><span class="small">Mientras tanto, cada parada abre Google Maps (que sí funciona sin red si descargasteis Roma).</span><div class="btns"><button class="btn sm" data-act="mapretry">Reintentar</button><button class="btn sm" data-act="tab" data-id="plan">Ir al plan</button></div>';
  }
  function renderMapbar() {
    if (!mapDay) mapDay = activeDay() && activeDay() !== 'vie' ? activeDay() : 'sab';
    $('#mapbar').innerHTML = '<div class="chips">' + [['sab', 'Sábado'], ['dom', 'Domingo'], ['lun', 'Lunes'], ['all', 'Todo']].map(x => '<button class="chip" data-act="mapd" data-id="' + x[0] + '" aria-pressed="' + (mapDay === x[0]) + '">' + x[1] + '</button>').join('') + '<button class="chip" data-act="mapfood" aria-pressed="' + showFood + '">Comer</button><button class="chip" data-act="mapflat" aria-pressed="' + !flat + '">3D</button></div>';
  }
  function drawMap() {
    if (!mapReady) return;
    markers.forEach(m => m.remove()); markers = [];
    const ids = mapDay === 'all' ? ['sab', 'dom', 'lun'] : [mapDay], feats = [], bounds = new maplibregl.LngLatBounds();
    ids.forEach(did => {
      const list = dayStops(did).filter(s => (s.lat || s.hotel) && s.lat !== 41.7951 && s.lat !== 41.7999), line = [];
      list.forEach((s, i) => {
        const c = coords(s); line.push(c); bounds.extend(c);
        if (s.hotel) return;
        const el = document.createElement('button'); el.className = 'mk' + (state.done[s.id] ? ' done' : ''); el.style.background = dayById[did].color; el.textContent = i + 1; el.setAttribute('aria-label', s.name);
        el.addEventListener('click', ev => { ev.stopPropagation(); mapCard('stop', s.id); });
        markers.push(new maplibregl.Marker({ element: el }).setLngLat(c).addTo(map));
      });
      feats.push({ type: 'Feature', properties: { color: dayById[did].color }, geometry: { type: 'LineString', coordinates: line } });
    });
    const hel = document.createElement('button'); hel.className = 'mk home'; hel.textContent = 'H'; hel.setAttribute('aria-label', 'Alojamiento');
    hel.addEventListener('click', ev => { ev.stopPropagation(); mapCard('hotel'); });
    markers.push(new maplibregl.Marker({ element: hel }).setLngLat([T.hotel.lng, T.hotel.lat]).addTo(map));
    if (showFood) RN.food.forEach(f => { const el = document.createElement('button'); el.className = 'mk food'; el.textContent = f.type === 'Helado' ? 'G' : f.type === 'Café' ? 'C' : 'R'; el.setAttribute('aria-label', f.name); el.addEventListener('click', ev => { ev.stopPropagation(); mapCard('food', f.id); }); markers.push(new maplibregl.Marker({ element: el }).setLngLat([f.lng, f.lat]).addTo(map)); });
    map.getSource('rn-route').setData({ type: 'FeatureCollection', features: feats });
    if (!bounds.isEmpty() && !pendingFly) map.fitBounds(bounds, { padding: { top: 70, bottom: 40, left: 40, right: 40 }, pitch: flat ? 0 : 58, bearing: flat ? 0 : -18, duration: 900, maxZoom: 15.500 });
  }
  function mapCard(kind, id) {
    const n = $('#mapnote'); n.hidden = false;
    if (kind === 'hotel') n.innerHTML = '<b>Vuestro alojamiento</b><span class="small">Zona Sallustiano. La dirección exacta se guarda en Ajustes.</span><div class="btns"><a class="btn sm pri" target="_blank" rel="noopener" href="' + gdir(hotelQ(), 'transit') + '">Ir ahora</a><button class="btn sm" data-act="mapclose">Cerrar</button></div>';
    else if (kind === 'food') { const f = foodById[id]; n.innerHTML = '<span class="eyebrow">' + esc(f.type) + ' · ' + esc(f.pp) + '</span><b>' + esc(f.name) + '</b><span class="small">' + esc(f.order) + '</span><div class="btns"><button class="btn sm pri" data-act="food" data-id="' + f.id + '">Ficha</button><button class="btn sm" data-act="mapclose">Cerrar</button></div>'; }
    else { const s = byId[id]; n.innerHTML = '<span class="eyebrow">' + esc(dayById[s.day].label) + ' · ' + fmt(sMin(s)) + '</span><b style="font-family:var(--display);font-size:1.15rem">' + esc(s.name) + '</b><span class="small">' + esc(s.brief) + '</span><div class="btns"><button class="btn sm pri" data-act="stop" data-id="' + s.id + '">Ficha</button><button class="btn sm" data-act="fly" data-id="' + s.id + '">Vuelo 3D</button></div>'; }
  }
  function flyTo(id) {
    const s = byId[id], c = coords(s);
    if (!mapReady) { pendingFly = id; return; }
    if (orbit) cancelAnimationFrame(orbit);
    mapCard('stop', id);
    map.flyTo({ center: c, zoom: 17.200, pitch: 66, bearing: map.getBearing() + 40, duration: 2600, essential: true });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    map.once('moveend', () => { const t0 = performance.now(), b0 = map.getBearing(); const spin = t => { const k = (t - t0) / 14000; if (k >= 1 || state.tab !== 'mapa') { orbit = null; return; } map.setBearing(b0 + 150 * k); orbit = requestAnimationFrame(spin); }; orbit = requestAnimationFrame(spin); });
  }

  /* ───── acciones ───── */
  let toastT; function toast(t) { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, 2600); }
  function go(tab) { state.tab = tab; save(); closeSheet(); render(); window.scrollTo(0, 0); enter(); }
  function enter() { view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }
  function exportDiary() {
    const txt = 'ROMA NOSTRA · diario\n\n' + RN.days.map(d => d.label.toUpperCase() + '\n' + dayStops(d.id).map(s => (state.done[s.id] ? '[x] ' : state.skip[s.id] ? '[-] ' : '[ ] ') + s.t + ' ' + s.name + (state.notes[s.id] ? '\n     ' + state.notes[s.id] : '')).join('\n')).join('\n\n') + '\n\nHALLAZGO DEL VIAJE\n' + (state.notes._viaje || '—') + '\n\nPROBADO\n' + RN.musts.filter(m => state.musts[m.id]).map(m => m.name).join(', ');
    if (navigator.share) { navigator.share({ title: 'Roma Nostra · diario', text: txt }).catch(() => { }); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = 'roma-nostra-diario.txt'; a.click(); toast('Diario descargado');
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closeSheet();
    const tabB = e.target.closest('#tabs button'); if (tabB) return go(tabB.dataset.tab);
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, id = b.dataset.id;
    switch (a) {
      case 'tab': return go(id);
      case 'stop': return stopSheet(id);
      case 'food': return foodSheet(id);
      case 'listen': stopSheet(id); return play(id);
      case 'play': return play(id);
      case 'pause': if (synth) { if (synth.paused) { synth.resume(); setSt('Reproduciendo…'); } else if (synth.speaking) { synth.pause(); setSt('En pausa.'); } } return;
      case 'stopaudio': stopAudio(); return setSt('Parado.');
      case 'rate': state.rate = state.rate >= 1.200 ? .85 : state.rate >= 1 ? 1.200 : 1; save(); b.textContent = 'Velocidad ' + state.rate + '×'; return;
      case 'done': state.done[id] ? delete state.done[id] : (state.done[id] = Date.now()); delete state.skip[id]; save(); closeSheet(); render(); if (state.done[id]) toast('Hecho. Siguiente parada lista.'); return;
      case 'doneprev': { const st = byId[id]; pending(st.day).some(x => { if (x.id === id) return true; state.done[x.id] = Date.now(); return false; }); save(); return render(); }
      case 'skip': state.skip[id] ? delete state.skip[id] : (state.skip[id] = true); save(); closeSheet(); render(); return;
      case 'prep': state.prep[id] ? delete state.prep[id] : (state.prep[id] = true); save(); b.setAttribute('aria-checked', !!state.prep[id]); return;
      case 'must': state.musts[id] ? delete state.musts[id] : (state.musts[id] = true); save(); b.setAttribute('aria-checked', !!state.musts[id]); return;
      case 'preview': state.preview = id; save(); render(); window.scrollTo(0, 0); return enter();
      case 'planday': state.planDay = id; save(); render(); return enter();
      case 'zone': state.zone = id; save(); return render();
      case 'wx': toast('Actualizando el tiempo…'); return fetchWx(true);
      case 'late': return lateSheet();
      case 'lateapply': return lateApply(+id);
      case 'undo': return undo();
      case 'tired': return tiredSheet();
      case 'tiredapply': return tiredApply();
      case 'hungry': return hungrySheet();
      case 'rain': return rainSheet();
      case 'airport': return airportSheet();
      case 'export': return exportDiary();
      case 'size': state.size = id; save(); applyPrefs(); return render();
      case 'theme': state.theme = id; save(); applyPrefs(); return render();
      case 'resetday': dayStops(id).forEach(s => { delete state.done[s.id]; delete state.skip[s.id]; }); delete state.shift[id]; state.undo = null; save(); render(); return toast('Día reiniciado');
      case 'resetall': if (b.dataset.sure) { ['done', 'skip', 'shift', 'notes', 'musts', 'prep'].forEach(k => { state[k] = {}; }); state.undo = null; save(); render(); toast('Progreso borrado'); } else { b.dataset.sure = 1; b.textContent = 'Pulsad otra vez para confirmar'; } return;
      case 'mapday': mapDay = id === 'vie' ? 'sab' : id; return go('mapa');
      case 'mapd': mapDay = id; $('#mapnote').hidden = true; renderMapbar(); return drawMap();
      case 'mapfood': showFood = !showFood; renderMapbar(); return drawMap();
      case 'mapflat': flat = !flat; renderMapbar(); if (mapReady) map.easeTo({ pitch: flat ? 0 : 58, bearing: flat ? 0 : -18, duration: 700 }); return;
      case 'mapclose': $('#mapnote').hidden = true; return;
      case 'mapretry': if (map) { try { map.remove(); } catch (er) { /* ya eliminado */ } } map = null; mapReady = false; $('#mapnote').hidden = true; return initMap();
      case 'fly': closeSheet(); state.tab = 'mapa'; save(); if (byId[id].day !== 'vie') mapDay = byId[id].day; pendingFly = id; render(); if (mapReady) { pendingFly = null; flyTo(id); } return;
    }
  });
  document.addEventListener('input', e => {
    const n = e.target.dataset && e.target.dataset.note; if (n) { state.notes[n] = e.target.value; save(); }
    if (e.target.id === 'hotel') { state.hotel = e.target.value.trim(); save(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  /* reloj y cuenta atrás */
  function tick() {
    const n = romeNow(); $('#clock').textContent = 'Roma ' + fmt(n.min);
    $('#net').hidden = navigator.onLine !== false;
    document.querySelectorAll('[data-countdown]').forEach(el => { const nm = nowMin(el.dataset.day); if (nm == null) return; const left = +el.dataset.countdown - nm; el.textContent = left > 0 ? 'Faltan ' + dur(left) + ' para estar en la puerta.' : 'Es ahora.'; });
  }
  let lastKey = '';
  setInterval(() => { tick(); const n = romeNow(), k = n.date + ':' + Math.floor(n.min / 5) + activeDay(); if (k !== lastKey) { lastKey = k; if (state.tab === 'hoy' && sheet.hidden && !document.activeElement.matches('textarea,input')) render(); fetchWx(); } }, 20000);
  window.addEventListener('online', () => { tick(); fetchWx(true); });
  window.addEventListener('offline', tick);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { fetchWx(); if (state.tab !== 'mapa' && sheet.hidden) render(); } });

  if (state.preview && phase() === 'viaje') state.preview = '';
  applyPrefs(); render(); enter(); fetchWx();
  if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost') navigator.serviceWorker && navigator.serviceWorker.register('sw.js').catch(() => { });
  window.__rn = { state, replan, romeNow, render };
})();
