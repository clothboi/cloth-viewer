/* ============================================================================
   TEXTYL — Examples section ("One photo -> the whole texture set")

   Script-rendered into the Webflow host #tx-examples (or .tx-examples). Whatever
   the Designer put inside the host is replaced. If this script never loads, the
   old Designer markup stays, so the section never goes blank.

   Layout
     desktop   [photo] -> [output wipe]
               [physics]   [map strip]
               [fabric picker, 6 across]
     mobile    photo, arrow, output, map strip, physics, picker (3 across)

   The output panel is a wipe: base colour on the left, the chosen map on the
   right, one hard seam. A hard seam (not a cross-fade) is what proves every map
   registers pixel-for-pixel with the base colour.

   Assets: ./examples/r4_<id>/{input,base,normal,height,ao,rough,opacity,thumb}.webp
   Normals are LOSSLESS WebP on purpose (lossy WebP forces 4:2:0 chroma, which
   bends a normal map's X/Z). Do not "optimise" them to lossy.
   ========================================================================= */
(function () {
  'use strict';

  var SRC = (document.currentScript && document.currentScript.src) || 'https://clothboi.github.io/cloth-viewer/examples.js';
  var ROOT = new URL('examples/', SRC).href;

  /* Physics are PLACEHOLDERS until the estimator ships: plausible values per
     fabric, shown as a 0-100 index plus weight / thickness. Marked "estimated"
     on the page. Tile sizes are real (apply.tile_mm from each render record). */
  var PICKS = [
    { id: 'r4_052498', name: 'Tartan',          tile: 18.8, phys: { weight: 230, thick: 0.62, stretchWarp: 58, stretchWeft: 52, bendWarp: 46, bendWeft: 41, buckle: 38, friction: 55 } },
    { id: 'r4_004830', name: 'Open linen', tile: 61.4, phys: { weight: 210, thick: 0.95, stretchWarp: 40, stretchWeft: 38, bendWarp: 62, bendWeft: 60, buckle: 52, friction: 70 } },
    { id: 'r4_015117', name: 'Linen shirting',  tile: 23.9, phys: { weight: 140, thick: 0.34, stretchWarp: 35, stretchWeft: 42, bendWarp: 44, bendWeft: 38, buckle: 45, friction: 62 } },
    { id: 'r4_061559', name: 'Donegal, fine',   tile: 7.3,  phys: { weight: 320, thick: 0.88, stretchWarp: 50, stretchWeft: 47, bendWarp: 58, bendWeft: 55, buckle: 41, friction: 74 } },
    { id: 'r4_070276', name: 'Donegal',         tile: 9.0,  phys: { weight: 360, thick: 1.02, stretchWarp: 48, stretchWeft: 44, bendWarp: 64, bendWeft: 59, buckle: 44, friction: 78 } },
    { id: 'r4_093351', name: 'Silk satin',      tile: 22.6, phys: { weight: 90,  thick: 0.18, stretchWarp: 30, stretchWeft: 36, bendWarp: 12, bendWeft: 10, buckle: 70, friction: 22 } }
  ];

  var MAPS = [
    { key: 'base',    label: 'Base colour' },
    { key: 'normal',  label: 'Normal' },
    { key: 'height',  label: 'Height' },
    { key: 'ao',      label: 'AO' },
    { key: 'rough',   label: 'Roughness' },
    { key: 'opacity', label: 'Opacity' }
  ];

  var CSS = [
    '#tx-examples.txe-on,.tx-examples.txe-on{display:block!important;max-width:none!important;width:100%!important;padding:0!important}',
    '.txe,.txe *{box-sizing:border-box;text-align:left}.txe-map,.txe-map *{text-align:center}.txe p,.txe span,.txe b,.txe em,.txe small,.txe button{font-family:inherit}',
    '.txe{--ink:#F3EFE7;--mute:rgba(243,239,231,.58);--faint:rgba(243,239,231,.14);--card:rgba(255,255,255,.035);--line:rgba(255,255,255,.12);--accent:#5fc4c9;',
    '  color:var(--ink);font-family:Inter,system-ui,-apple-system,sans-serif;width:100%;max-width:1040px;margin:0 auto}',
    '.txe-top{display:grid;grid-template-columns:minmax(0,1fr) 56px minmax(0,1fr);grid-template-areas:"photo arrow out" "maps maps maps" "phys phys phys";column-gap:0;row-gap:22px;align-items:start}',
    '.txe-photo{grid-area:photo}.txe-arrow{grid-area:arrow;align-self:center}.txe-out{grid-area:out}.txe-maps{grid-area:maps}.txe-phys{grid-area:phys}',
    '.txe-panel{position:relative;aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:#0d1615;border:1px solid var(--line);',
    '  box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 18px 40px -18px rgba(0,0,0,.7)}',
    '.txe-panel img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;user-select:none;-webkit-user-drag:none;transition:opacity .35s ease}',
    '.txe-panel img.txe-loading{opacity:0}',
    '.txe-tag{position:absolute;bottom:12px;z-index:3;padding:6px 11px;border-radius:999px;background:rgba(14,22,21,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);',
    '  border:1px solid rgba(255,255,255,.14);font-size:10.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink);pointer-events:none;white-space:nowrap}',
    '.txe-tag.l{left:12px}.txe-tag.r{right:12px}',
    '.txe-arrow{display:flex;align-items:center;justify-content:center;color:rgba(243,239,231,.55)}',
    '.txe-arrow svg{width:30px;height:30px}',
    '.txe-out{touch-action:pan-y;cursor:ew-resize}',
    '.txe-out.txe-plain{cursor:default}',
    '.txe-maplayer{z-index:1}',
    '.txe-seam{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:rgba(243,239,231,.92);z-index:2;pointer-events:none;box-shadow:0 0 10px rgba(0,0,0,.45)}',
    '.txe-knob{position:absolute;top:50%;left:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;pointer-events:none;',
    '  background:radial-gradient(140% 50% at 50% 0,rgba(255,255,255,.55) 0%,rgba(255,255,255,.2) 20%,transparent 45%),linear-gradient(#5b6563,#2a3231);',
    '  border:1px solid rgba(255,255,255,.35);box-shadow:0 2px 6px rgba(0,0,0,.55)}',
    '.txe-knob::before,.txe-knob::after{content:"";position:absolute;top:50%;width:0;height:0;margin-top:-4px;border:4px solid transparent}',
    '.txe-knob::before{left:7px;border-right-color:rgba(243,239,231,.9)}.txe-knob::after{right:7px;border-left-color:rgba(243,239,231,.9)}',
    '.txe-plain .txe-seam,.txe-plain .txe-maplayer,.txe-plain .txe-tag.r{display:none}',
    '.txe-maps{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}',
    '.txe-map{display:block;width:100%;appearance:none;background:none;border:0;padding:0;margin:0;cursor:pointer;color:var(--mute);font:500 11px/1.2 Inter,system-ui,sans-serif;letter-spacing:.02em;text-align:center;-webkit-tap-highlight-color:transparent}',
    '.txe-map .sw{display:block;aspect-ratio:1/1;border-radius:10px;overflow:hidden;border:1px solid var(--line);margin-bottom:6px;background:#0d1615 center/cover no-repeat;',
    '  transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .18s,border-color .18s}',
    '.txe-map:hover .sw{transform:translateY(-2px)}',
    '.txe-map[aria-pressed="true"]{color:var(--ink)}',
    '.txe-map[aria-pressed="true"] .sw{border-color:var(--accent);box-shadow:0 0 0 2px rgba(95,196,201,.35),0 6px 16px -6px rgba(0,0,0,.6)}',
    '.txe-map:focus-visible{outline:none}.txe-map:focus-visible .sw{outline:2px solid var(--ink);outline-offset:2px}',
    '.txe-phys{border:1px solid var(--line);background-color:rgba(20,24,25,.9);background-image:linear-gradient(180deg,rgba(120,185,196,.1),rgba(110,160,170,.04) 19%,rgba(255,255,255,0) 55%);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 8px 24px rgba(0,0,0,.35),0 2px 6px rgba(0,0,0,.25);padding:18px 22px 16px;display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);grid-template-areas:"h h" "kv bars" "note note";column-gap:36px}',
    '.txe-phys-h{grid-area:h}.txe-kv{grid-area:kv}.txe-bars{grid-area:bars}.txe-note{grid-area:note}',
    '.txe-phys-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px}',
    '.txe-phys-t{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#cfeeee;border:1px solid rgba(95,196,201,.4);background:rgba(95,196,201,.12);border-radius:999px;padding:4px 10px}',
    '.txe-pill{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}',
    '.txe-kv{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin-bottom:12px}',
    '.txe-kv div{display:flex;flex-direction:column;gap:2px}',
    '.txe-kv span{font-size:11px;color:var(--mute)}.txe-kv b{font-size:17px;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}',
    '.txe-kv b small{font-size:11px;font-weight:500;color:var(--mute);margin-left:3px}',
    '.txe-bars{display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;align-content:start;padding-top:4px}',
    '.txe-bar{display:grid;grid-template-columns:96px 1fr 26px;align-items:center;gap:10px;font-size:12px;color:var(--mute)}',
    '.txe-bar i{position:relative;height:4px;border-radius:4px;background:var(--faint);overflow:hidden}',
    '.txe-bar i::after{content:"";position:absolute;left:0;top:0;bottom:0;width:var(--v);border-radius:4px;background:linear-gradient(90deg,#3a7783,#5fc4c9);transition:width .5s cubic-bezier(.22,1,.36,1)}',
    '.txe-bar em{font-style:normal;text-align:right;color:var(--ink);font-variant-numeric:tabular-nums}',
    '.txe-note{margin:14px 0 0;font-size:11px;line-height:1.4;color:rgba(243,239,231,.42)}',
    '.txe-pick{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;align-items:start;margin-top:30px;padding-top:24px;border-top:1px solid var(--line)}',
    '.txe-pick-h{grid-column:1/-1;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin:0 0 2px}',
    '.txe-fab{display:block;width:100%;appearance:none;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:left;color:var(--mute);font:500 12px/1.3 Inter,system-ui,sans-serif;-webkit-tap-highlight-color:transparent}',
    '.txe-fab .sw{display:block;aspect-ratio:1/1;border-radius:14px;overflow:hidden;border:1px solid var(--line);margin-bottom:8px;background:#0d1615 center/cover no-repeat;',
    '  transition:transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s,border-color .2s}',
    '.txe-fab small{display:block;font-size:11px;color:rgba(243,239,231,.4);margin-top:1px}',
    '.txe-fab:hover .sw{transform:translateY(-3px)}',
    '.txe-fab[aria-pressed="true"]{color:var(--ink)}',
    '.txe-fab[aria-pressed="true"] .sw{border-color:var(--accent);box-shadow:0 0 0 2px rgba(95,196,201,.35),0 10px 24px -10px rgba(0,0,0,.7)}',
    '.txe-fab:focus-visible{outline:none}.txe-fab:focus-visible .sw{outline:2px solid var(--ink);outline-offset:2px}',
    '@media (max-width:760px){',
    '  .txe-top{grid-template-columns:minmax(0,1fr);grid-template-areas:"photo" "arrow" "out" "maps" "phys";row-gap:12px}',
    '  .txe-phys{grid-template-columns:minmax(0,1fr);grid-template-areas:"h" "kv" "bars" "note";padding:16px 16px 14px}',
    '  .txe-bars{grid-template-columns:minmax(0,1fr)}',
    '  .txe-maps{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 10px}',
    '  .txe-arrow svg{transform:rotate(90deg);width:26px;height:26px}',
    '  .txe-maps{gap:6px}.txe-map{font-size:10px}',
    '  .txe-pick{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
    '  .txe-bar{grid-template-columns:86px 1fr 24px}',
    '}',
    '@media (prefers-reduced-motion:reduce){.txe *{transition:none!important}}'
  ].join('\n');

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function src(p, f) { return ROOT + p.id + '/' + f + '.webp'; }

  function boot() {
    var host = document.getElementById('tx-examples') || document.querySelector('.tx-examples');
    if (!host || host.dataset.txeReady) return;
    host.dataset.txeReady = '1';

    var style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);

    var root = el('div', 'txe');
    var top = el('div', 'txe-top');

    // photo
    var photo = el('div', 'txe-panel txe-photo');
    var photoImg = el('img'); photoImg.alt = 'Input fabric photo';
    photo.appendChild(photoImg); photo.appendChild(el('div', 'txe-tag l', 'Photo'));

    // arrow
    var arrow = el('div', 'txe-arrow', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15"/><path d="M13 6l6 6-6 6"/></svg>');

    // output wipe
    var out = el('div', 'txe-panel txe-out');
    out.setAttribute('role', 'slider'); out.setAttribute('aria-label', 'Compare the base colour with the selected map'); out.tabIndex = 0;
    out.setAttribute('aria-valuemin', '0'); out.setAttribute('aria-valuemax', '100');
    var baseImg = el('img'); baseImg.alt = 'Base colour output';
    var mapImg = el('img', 'txe-maplayer'); mapImg.alt = '';
    var seam = el('div', 'txe-seam'); seam.appendChild(el('div', 'txe-knob'));
    var tagL = el('div', 'txe-tag l', 'Base colour'), tagR = el('div', 'txe-tag r', 'Normal');
    out.appendChild(baseImg); out.appendChild(mapImg); out.appendChild(seam); out.appendChild(tagL); out.appendChild(tagR);

    // map strip
    var maps = el('div', 'txe-maps');
    var mapBtns = MAPS.map(function (m) {
      var b = el('button', 'txe-map'); b.type = 'button';
      b.innerHTML = '<span class="sw"></span>' + m.label;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { setMap(m.key); });
      maps.appendChild(b); return b;
    });

    // physics
    var phys = el('div', 'txe-phys');
    phys.innerHTML =
      '<div class="txe-phys-h"><span class="txe-phys-t">Physics &middot; CLO3D</span><span class="txe-pill">Estimated</span></div>' +
      '<div class="txe-kv">' +
        '<div><span>Weight</span><b data-k="weight"></b></div>' +
        '<div><span>Thickness</span><b data-k="thick"></b></div>' +
        '<div><span>Tile size</span><b data-k="tile"></b></div>' +
        '<div><span>Repeat</span><b>Seamless</b></div>' +
      '</div>' +
      '<div class="txe-bars">' +
        bar('Stretch warp', 'stretchWarp') + bar('Stretch weft', 'stretchWeft') +
        bar('Bend warp', 'bendWarp') + bar('Bend weft', 'bendWeft') +
        bar('Buckling', 'buckle') + bar('Friction', 'friction') +
      '</div>' +
      '<p class="txe-note">Physics shown are preview values while the estimator is in the closed beta. Maps and tile size are real outputs.</p>';
    function bar(label, k) { return '<div class="txe-bar"><span>' + label + '</span><i data-b="' + k + '"></i><em data-v="' + k + '"></em></div>'; }

    top.appendChild(photo); top.appendChild(arrow); top.appendChild(out); top.appendChild(phys); top.appendChild(maps);

    // fabric picker
    var pick = el('div', 'txe-pick');
    pick.appendChild(el('p', 'txe-pick-h', 'Try another fabric'));
    var fabBtns = PICKS.map(function (p, i) {
      var b = el('button', 'txe-fab'); b.type = 'button';
      b.innerHTML = '<span class="sw" style="background-image:url(\'' + src(p, 'thumb') + '\')"></span>' + p.name + '<small>' + p.tile.toFixed(1) + ' mm tile</small>';
      b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Show ' + p.name);
      b.addEventListener('click', function () { setPick(i); });
      pick.appendChild(b); return b;
    });

    root.appendChild(top); root.appendChild(pick);
    host.innerHTML = ''; host.classList.add('txe-on'); host.appendChild(root);

    // ---------- state ----------
    var cur = 0, curMap = 'normal', split = 50;

    function swap(img, url) {
      if (img.getAttribute('src') === url) return;
      img.classList.add('txe-loading');
      var pre = new Image();
      pre.onload = function () { img.src = url; requestAnimationFrame(function () { img.classList.remove('txe-loading'); }); };
      pre.onerror = function () { img.classList.remove('txe-loading'); };
      pre.src = url;
    }
    function setSplit(v) {
      split = Math.max(0, Math.min(100, v));
      mapImg.style.clipPath = 'inset(0 0 0 ' + split + '%)';
      seam.style.left = split + '%';
      out.setAttribute('aria-valuenow', String(Math.round(split)));
    }
    function setMap(k) {
      curMap = k;
      var m = MAPS.filter(function (x) { return x.key === k; })[0];
      mapBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', MAPS[i].key === k ? 'true' : 'false'); });
      out.classList.toggle('txe-plain', k === 'base');
      if (k !== 'base') { tagR.textContent = m.label; swap(mapImg, src(PICKS[cur], k)); }
    }
    function setPick(i) {
      cur = i; var p = PICKS[i];
      fabBtns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      swap(photoImg, src(p, 'input'));
      swap(baseImg, src(p, 'base'));
      mapBtns.forEach(function (b, j) { b.querySelector('.sw').style.backgroundImage = 'url("' + src(p, MAPS[j].key === 'base' ? 'thumb' : MAPS[j].key) + '")'; });
      if (curMap !== 'base') swap(mapImg, src(p, curMap));
      photoImg.alt = 'Input photo: ' + p.name; baseImg.alt = 'Base colour output: ' + p.name;
      var ph = p.phys;
      phys.querySelector('[data-k="weight"]').innerHTML = ph.weight + '<small>g/m&sup2;</small>';
      phys.querySelector('[data-k="thick"]').innerHTML = ph.thick.toFixed(2) + '<small>mm</small>';
      phys.querySelector('[data-k="tile"]').innerHTML = p.tile.toFixed(1) + '<small>mm</small>';
      ['stretchWarp', 'stretchWeft', 'bendWarp', 'bendWeft', 'buckle', 'friction'].forEach(function (k) {
        phys.querySelector('[data-b="' + k + '"]').style.setProperty('--v', ph[k] + '%');
        phys.querySelector('[data-v="' + k + '"]').textContent = ph[k];
      });
    }

    // ---------- wipe drag (horizontal only, so a finger can still scroll the page) ----------
    var dragging = false;
    function fromEvent(e) { var r = out.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
    out.addEventListener('pointerdown', function (e) {
      if (curMap === 'base') return;
      dragging = true; out.setPointerCapture(e.pointerId); setSplit(fromEvent(e));
      if (e.pointerType !== 'touch') e.preventDefault();
    });
    out.addEventListener('pointermove', function (e) { if (dragging) setSplit(fromEvent(e)); });
    var stop = function () { dragging = false; };
    out.addEventListener('pointerup', stop); out.addEventListener('pointercancel', stop);
    out.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { setSplit(split - 5); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setSplit(split + 5); e.preventDefault(); }
    });

    setSplit(50); setMap('normal'); setPick(0);

    // warm the cache for the other fabrics' first images once the page is idle
    var idle = window.requestIdleCallback || function (f) { setTimeout(f, 1500); };
    idle(function () { PICKS.forEach(function (p, i) { if (i) { new Image().src = src(p, 'input'); new Image().src = src(p, 'base'); } }); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
