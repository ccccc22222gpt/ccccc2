/* Roma Nostra · ilustraciones de línea, dibujadas con código (sin imágenes externas ni licencias de terceros).
   Lienzo 320 × 140, suelo en y = 128. Cada dibujo es una lista de trazos que se unen en un único <path>. */
(function () {
  'use strict';
  const G = 128;
  const arch = (x, w, h, y) => { y = y == null ? G : y; return `M${x} ${y}V${y - h + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y}`; };
  const line = (x1, y1, x2, y2) => `M${x1} ${y1}L${x2} ${y2}`;
  const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
  const cols = (x0, x1, n, y0, y1) => Array.from({ length: n }, (_, i) => { const x = x0 + (x1 - x0) * i / (n - 1); return `M${x.toFixed(1)} ${y0}V${y1}`; }).join('');
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
  const pine = (x, h) => `M${x} ${G}V${G - h + 6}M${x - 17} ${G - h + 8}q17 -20 34 0q-17 6 -34 0zM${x} ${G - h + 22}l-7 -10M${x} ${G - h + 26}l8 -12`;
  const dome = (x0, x1, y, k) => { const r = (x1 - x0) / 2; return `M${x0} ${y}a${r} ${r * (k || 1)} 0 0 1 ${x1 - x0} 0`; };
  const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const wave = (x, y, n) => `M${x} ${y}q5 -4 10 0` + rep(n - 1, () => 't10 0');

  const colosseum =
    `M40 ${G}V24H190V62l12 6H280V${G}` + line(40, 38, 190, 38) + line(40, 68, 280, 68) + line(40, 98, 280, 98) +
    rep(11, i => arch(46 + i * 21.4, 14, 24) + arch(46 + i * 21.4, 14, 24, 96)) +
    rep(7, i => arch(46 + i * 21.4, 14, 24, 66) + rect(49 + i * 21.4, 28, 7, 6));

  const ART = {
    cover: pine(22, 104) + pine(300, 88) + colosseum,
    colosseum: colosseum + pine(302, 70),
    pantheon:
      `M58 ${G}V74M262 ${G}V74` + `M58 74Q160 6 262 74` + line(58, 74, 96, 74) + line(224, 74, 262, 74) + `M70 66H104M216 66H250M84 58H120M200 58H236` + `M154 40h12` +
      `M88 80L160 50L232 80z` + rect(88, 80, 144, 8) + cols(95, 225, 8, 88, G) + line(104, 84, 216, 84),
    stpeter:
      rect(92, 86, 136, 42) + line(92, 78, 228, 78) + `M92 86V78M228 86V78` + cols(100, 220, 8, 90, G) + `M140 86L160 74L180 86` +
      rep(7, i => line(98 + i * 20.6, 78, 98 + i * 20.6, 73)) +
      rect(132, 52, 56, 24) + cols(138, 182, 6, 54, 74) + `M132 52C132 12 188 12 188 52` + line(160, 22, 160, 52) + `M146 26Q142 40 142 52M174 26Q178 40 178 52` + rect(155, 10, 10, 10) + `M160 10V2M157 5h6` +
      dome(100, 124, 76) + dome(196, 220, 76) +
      line(18, 104, 86, 104) + cols(22, 84, 9, 104, G) + line(234, 104, 302, 104) + cols(236, 298, 9, 104, G),
    trevi:
      rect(48, 30, 224, 84) + line(48, 44, 272, 44) + arch(132, 56, 64, 114) + `M112 44V114M124 44V114M196 44V114M208 44V114` + circle(160, 23, 7) + `M150 30h20` +
      rep(2, r => rep(3, i => rect(58 + i * 16, 54 + r * 26, 8, 14) + rect(222 + i * 16, 54 + r * 26, 8, 14))) +
      `M126 114l10 -8l8 5l12 -10l10 8l12 -6l10 9l8 -4` + `M160 96v-14M154 86l6 -6l6 6` +
      `M30 ${G}q130 -22 260 0` + wave(70, 124, 5) + wave(150, 122, 5) + wave(206, 125, 4),
    castel:
      line(0, 110, 320, 110) + rep(3, i => `M${28 + i * 95} ${G}a36 17 0 0 1 72 0`) + rep(6, i => line(20 + i * 56, 110, 20 + i * 56, 102)) +
      rect(72, 96, 176, 14) + `M92 96V58H228V96` + rep(9, i => rect(94 + i * 15, 52, 8, 6)) + rect(132, 34, 56, 24) + rep(4, i => rect(138 + i * 13, 40, 5, 8)) +
      `M160 34V20M160 24l-9 -5M160 24l10 -8M157 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0`,
    coronari:
      `M96 ${G}V10M224 ${G}V22` + `M96 30h34` + `M130 30v10M122 40h16l-3 22h-10z` + line(124, 62, 136, 62) + `M130 44v12` +
      `M240 46a14 18 0 1 0 28 0a14 18 0 1 0 -28 0` + `M248 46a6 8 0 1 0 12 0a6 8 0 1 0 -12 0` + `M254 66v6M246 72h16` +
      rect(40, 40, 30, 44) + line(55, 40, 55, 84) + rect(40, 96, 30, 32) + arch(150, 46, 70) +
      rep(5, i => `M${104 + i * 24} ${G - 4}h10`) + `M96 10Q160 28 224 22` + rep(4, i => `M${120 + i * 26} ${18 + i}q4 12 -2 20`),
    navona:
      `M153 86L158 22L160 14L162 22L167 86z` + `M126 ${G}l8 -24l14 -18h24l14 18l8 24` + `M146 104q14 -10 28 0` + `M92 ${G}q68 16 136 0` + wave(100, 122, 3) + wave(190, 122, 3) +
      `M206 ${G}V78H296V${G}` + rect(214, 46, 14, 32) + rect(274, 46, 14, 32) + `M214 46l7 -10l7 10M274 46l7 -10l7 10` + rect(236, 56, 30, 22) + `M236 56C236 30 266 30 266 56` + `M251 36V28` + arch(243, 16, 34) +
      `M8 ${G}V72H44V60H84V76H112V${G}` + rep(2, r => rep(4, i => rect(16 + i * 24, 84 + r * 20, 8, 10))),
    ignazio:
      circle(160, 70, 56) + circle(160, 70, 42) + circle(160, 70, 26) + circle(160, 70, 9) +
      rep(12, i => { const a = i * Math.PI / 6, c = Math.cos(a), s = Math.sin(a); return line((160 + 9 * c).toFixed(1), (70 + 9 * s).toFixed(1), (160 + 56 * c).toFixed(1), (70 + 56 * s).toFixed(1)); }) +
      rep(12, i => { const a = (i + .5) * Math.PI / 6, c = Math.cos(a), s = Math.sin(a); return arch((160 + 34 * c - 3).toFixed(1), 6, 9, (70 + 34 * s + 4).toFixed(1)); }) +
      `M72 6H248M72 134H248M84 6V134M236 6V134`,
    spagna:
      rect(122, 12, 20, 46) + rect(178, 12, 20, 46) + `M122 12l10 -8l10 8M178 12l10 -8l10 8` + rect(142, 28, 36, 30) + arch(152, 16, 22, 58) + arch(127, 10, 16, 34) + arch(183, 10, 16, 34) +
      `M157 58L160 26L163 58` + rep(9, i => line(160 - 30 - i * 11, 64 + i * 7, 160 + 30 + i * 11, 64 + i * 7)) + `M130 64L42 120M190 64L278 120` +
      `M134 123q26 9 52 0M148 123v-5h24v5M160 118v-6`,
    pincio:
      circle(204, 70, 17) + rep(7, i => { const a = Math.PI + i * Math.PI / 6, c = Math.cos(a), s = Math.sin(a); return line((204 + 23 * c).toFixed(1), (70 + 23 * s).toFixed(1), (204 + 31 * c).toFixed(1), (70 + 31 * s).toFixed(1)); }) +
      `M0 96H34V86H58V96H86V82H102V96H140V90H168V96H184V88a20 24 0 0 1 40 0V96H250V84H270V96H320` + `M204 64V56M201 59h6` + `M122 96V78l6 -8l6 8V96` +
      line(0, 108, 320, 108) + line(0, 112, 320, 112) + rep(26, i => `M${8 + i * 12} 112q-3 8 0 16`) + pine(40, 98) + pine(288, 84),
    popolo:
      `M157 ${G}L159 30L160 22L161 30L163 ${G}` + rect(148, 116, 24, 12) +
      [44, 216].map(x => `M${x} ${G}V86H${x + 60}V${G}` + `M${x - 4} 86L${x + 30} 70L${x + 64} 86z` + cols(x + 6, x + 54, 4, 90, G) + rect(x + 12, 52, 36, 16) + `M${x + 12} 52C${x + 12} 26 ${x + 48} 26 ${x + 48} 52` + `M${x + 30} 32V24`).join('') +
      `M0 ${G}V98H36M284 98H320V${G}`,
    forum:
      rect(60, 26, 56, 10) + cols(68, 108, 3, 36, G) + line(56, 26, 120, 26) +
      rect(128, 52, 44, 8) + cols(134, 166, 4, 60, G) + `M128 52L150 40L172 52` +
      rect(186, 58, 94, 70) + line(186, 74, 280, 74) + arch(217, 32, 50) + arch(192, 18, 34) + arch(256, 18, 34) + rect(204, 62, 58, 8) +
      rect(20, 118, 22, 10) + rect(30, 108, 16, 10) + `M4 ${G}h12v-6h-12` + pine(300, 92),
    palatine:
      rep(5, i => arch(58 + i * 34, 24, 46)) + line(52, 78, 228, 78) + rep(3, i => arch(58 + i * 34, 24, 40, 76)) + `M52 ${G}V34H160V40l10 4v34M228 78V${G}` + line(52, 34, 160, 34) +
      `M172 60l8 -6l10 8l12 -4l10 10l16 10` + pine(26, 92) + pine(262, 104) + pine(298, 78),
    campidoglio:
      rect(84, 52, 152, 66) + line(84, 62, 236, 62) + rect(148, 14, 24, 38) + `M148 14l12 -10l12 10` + arch(155, 10, 16, 40) +
      `M112 118L160 86L208 118` + line(132, 104, 188, 104) + rep(2, r => rep(6, i => r === 1 && i > 1 && i < 4 ? '' : rect(94 + i * 24, 70 + r * 22, 10, 14))) +
      `M84 118L34 ${G}M236 118L286 ${G}` + cols(40, 78, 4, 96, 124) + cols(242, 280, 4, 96, 124) + `M36 96H84M236 96H284` +
      rect(153, 112, 14, 16) + `M152 106q8 -8 16 0v6h-16zM166 104l5 -7l3 3M156 100v-7`,
    ghetto:
      `M84 62L160 26L236 62z` + rect(84, 62, 152, 8) + cols(94, 118, 2, 70, G) + cols(218, 228, 2, 70, G) +
      arch(134, 68, 58) + `M126 ${G}V70M210 ${G}V70` + rep(4, r => rep(3, i => `M${128 + ((r % 2) * 3)} ${78 + r * 12}h4`)) + rep(4, r => `M${204 - ((r % 2) * 3)} ${78 + r * 12}h4`) +
      `M240 ${G}V84H296V${G}` + rect(252, 94, 12, 16) + rect(274, 94, 12, 16) + `M24 ${G}V92H76V${G}` + arch(40, 20, 28) +
      rep(4, i => rect(96 + i * 34, 131, 6, 5)),
    trastevere:
      rect(104, 52, 104, 76) + `M100 52L156 30L212 52` + rect(104, 52, 104, 12) + rep(12, i => `M${110 + i * 8} 55v6`) + rep(3, i => arch(120 + i * 30, 12, 22, 92)) + rep(5, i => arch(108 + i * 20, 14, 28)) + line(104, 98, 208, 98) +
      rect(214, 14, 26, 114) + `M214 14l13 -12l13 12` + rep(4, i => line(214, 36 + i * 22, 240, 36 + i * 22) + arch(218, 7, 12, 34 + i * 22) + arch(229, 7, 12, 34 + i * 22)) +
      `M36 ${G}l6 -14h40l6 14M44 114l4 -8h28l4 8M62 106V92M56 92h12` + wave(46, 122, 3),
    vatican:
      rep(6, i => { const rx = 118 - i * 19, ry = 58 - i * 9.500, cx = 160 + i * 5, cy = 70 + i * 2; return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`; }) +
      rep(22, i => { const a = i * Math.PI / 11, c = Math.cos(a), s = Math.sin(a); return line((160 + 118 * c).toFixed(1), (70 + 58 * s).toFixed(1), (165 + 99 * c).toFixed(1), (72 + 48.500 * s).toFixed(1)); }),
    food:
      circle(160, 76, 46) + circle(160, 76, 32) + `M140 76q6 -16 20 -8t20 -6M138 84q10 -12 22 -4t22 -8M146 92q8 -8 16 -2t14 -6` +
      `M84 30v26a8 8 0 0 0 16 0V30M92 30v96` + `M236 30q-10 16 -6 40h6zM236 30v96` + `M262 ${G}h20M272 ${G}V104M258 78h28q0 26 -14 26t-14 -26z`,
    cafe:
      `M112 70h82v14a34 34 0 0 1 -34 34h-14a34 34 0 0 1 -34 -34z` + `M194 76h10a12 12 0 0 1 0 24h-14` + `M92 124h122` + `M136 58q-8 -10 0 -20t0 -20M156 58q-8 -10 0 -20t0 -20M176 58q-8 -10 0 -20t0 -20` + line(124, 82, 182, 82),
    gelato:
      `M134 70L160 128L186 70` + `M140 84l34 16M146 98l22 10M180 84l-34 16M174 98l-22 10` + `M128 70a32 30 0 0 1 64 0z` + `M144 44a18 18 0 0 1 32 0` + circle(160, 22, 5) + `M160 27v6`,
    metro:
      `M100 ${G}V44a22 22 0 0 1 22 -22h76a22 22 0 0 1 22 22V${G}` + rect(114, 40, 40, 34) + rect(166, 40, 40, 34) + line(100, 92, 220, 92) + circle(122, 108, 6) + circle(198, 108, 6) + rect(142, 100, 36, 8) +
      `M60 ${G}L96 60M260 ${G}L224 60` + circle(40, 40, 18) + `M31 49V31l9 11l9 -11v18` + line(40, 58, 40, G),
    train:
      `M24 104V60q0 -16 16 -16H250q34 6 44 44v16z` + rep(5, i => rect(40 + i * 40, 56, 28, 20)) + `M246 56h14q14 6 20 20h-34z` + line(24, 88, 294, 88) +
      rep(4, i => circle(60 + i * 62, 112, 8)) + line(0, 122, 320, 122) + rep(16, i => `M${6 + i * 20} 122v6`),
    taxi:
      `M70 108V86l22 -6l20 -28h76l22 28l32 6q10 2 10 12v10z` + `M118 80l12 -20h28v20zM166 60h20l14 20h-34z` + circle(108, 108, 12) + circle(214, 108, 12) + rect(142, 40, 36, 12) + `M150 49v-6M146 43h8M160 49l3 -6l3 6M170 43l6 6M176 43l-6 6` +
      `M40 30a14 14 0 1 0 14 22a18 18 0 0 1 -14 -22z` + rep(3, i => circle(250 + i * 22, 24 + (i % 2) * 14, 1.500)),
    plane:
      `M40 92l190 -44q30 -6 36 4t-22 18l-60 16l-58 34h-16l32 -36l-46 10l-22 16h-12l10 -22z` + `M132 66l-34 -30h14l52 22` + rep(4, i => circle(196 + i * 12, 60 - i * 2.800, 1.800)) +
      `M20 40q10 -12 24 -4q12 -8 22 4M236 104q10 -10 22 -2q10 -6 20 2` + line(0, G, 320, G),
    hotel:
      rect(96, 34, 128, 94) + `M88 34H232M96 34l64 -22l64 22` + rep(3, r => rep(4, i => r === 2 && (i === 1 || i === 2) ? '' : rect(108 + i * 30, 46 + r * 26, 14, 16))) + arch(146, 28, 34) + circle(168, 112, 1.500) +
      `M258 20a14 14 0 1 0 14 22a18 18 0 0 1 -14 -22z` + rep(4, i => circle(40 + i * 14, 18 + ((i * 7) % 20), 1.500)) + pine(52, 76)
  };

  const BY_STOP = { v1: 'plane', v2: 'taxi', v3: 'hotel', s1: 'metro', s2: 'stpeter', s3: 'castel', s4: 'coronari', s5: 'navona', s6: 'food', s7: 'pantheon', s8: 'ignazio', s9: 'trevi', s10: 'spagna', s11: 'pincio', s12: 'popolo', s13: 'food',
    d1: 'metro', d2: 'forum', d3: 'palatine', d4: 'food', d5: 'colosseum', d6: 'colosseum', d7: 'campidoglio', d8: 'ghetto', d9: 'trastevere', d10: 'food', l1: 'hotel', l2: 'cafe', l3: 'vatican', l4: 'vatican', l5: 'metro', l6: 'train', l7: 'plane', l8: 'plane' };
  const BY_FOOD = { 'Café': 'cafe', 'Helado': 'gelato' };
  const BY_DAY = { vie: 'hotel', sab: 'stpeter', dom: 'colosseum', lun: 'vatican' };

  function svg(key, cls) {
    const d = ART[key]; if (!d) return '';
    const floor = key === 'ignazio' || key === 'vatican' || key === 'plane' || key === 'train' ? '' : '<path class="acc" d="M0 128H320"/>';
    return '<svg class="art ' + (cls || '') + '" viewBox="0 0 320 140" fill="none" aria-hidden="true"><path class="ink" pathLength="1" d="' + d + '"/>' + floor + '</svg>';
  }
  window.RN.art = { svg, stop: (id, cls) => svg(BY_STOP[id], cls), food: (type, cls) => svg(BY_FOOD[type] || 'food', cls), day: (id, cls) => svg(BY_DAY[id], cls), keys: Object.keys(ART) };
})();
