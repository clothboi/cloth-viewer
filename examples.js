/* ============================================================================
   TEXTYL — texture comparison slider ("every map, from one photo")

   The markup and ALL styling are native Webflow, built in the Designer:

     .tx-examples
       .tx-cmp
         .tx-cmp-layer.tx-cmp-base      background-image = base colour
         .tx-cmp-layer.tx-cmp-normal    background-image = normal map, clipped
         .tx-cmp-tag.tx-cmp-tag-left    "Base colour"
         .tx-cmp-tag.tx-cmp-tag-right   "Normal map"
         .tx-cmp-handle > .tx-cmp-knob
       .tx-thumbs
         .tx-tex-thumb.tex-<fabric>  x6   (first one also .is-active)

   This file adds behaviour only. It binds to what is already on the page, so
   the section still renders — with the default fabric, seam parked at 55% —
   if the script never loads. Nothing here creates layout.

   Why a wipe and not a cross-fade: a cross-fade blends the two maps into mush.
   A hard seam is what proves the normal map registers pixel-for-pixel with the
   base colour. Any drift shows up as a kink in the pattern right at the seam.
   That is the whole argument this section is making, so the seam stays sharp.
   ========================================================================= */
(function () {
  'use strict';

  var CDN = 'https://cdn.prod.website-files.com/6a0979ff745bb701c7a098de/';

  /* Order must match the thumbnail order in the Designer.
     The normals are LOSSLESS WebP on purpose: lossy WebP is hard-locked to
     4:2:0 chroma subsampling, which mangles a normal map's X/Z channels
     (measured ~6.7 deg mean angular error). Do not "optimise" these to lossy. */
  var FABRICS = [
    { name: 'Tartan',      base: '6a458da6ca5c7cf3c0856648_fab-tartan.webp',      normal: '6a51028ad71c647f08b166b1_tx-tartan-normal.webp' },
    { name: 'Silk',        base: '6a458da61a9344acaeb5437c_fab-silk.webp',        normal: '6a51028753e23d1e9b2ca90e_tx-silk-normal.webp' },
    { name: 'Houndstooth', base: '6a458da6551541fdbfbb277e_fab-houndstooth.webp', normal: '6a51028270ff2b0b9059ad17_tx-houndstooth-normal.webp' },
    { name: 'Gingham',     base: '6a458da65acd7003367e6fe5_fab-gingham.webp',     normal: '6a51027f1e63b6a966b1cb11_tx-gingham-normal.webp' },
    { name: 'Madras',      base: '6a458da6bc6477f534eea23a_fab-madras.webp',      normal: '6a510285d939d0e5fc234a7a_tx-madras-normal.webp' },
    { name: 'Denim',       base: '6a458da6e9fd06b307b7e2da_fab-denim.webp',       normal: '6a51027c3c0f4caaa87ac5bd_tx-denim-normal.webp' }
  ];

  var SPLIT = 55;   // opening seam, %. Matches the value baked into the CSS.

  function url(f) { return 'url("' + CDN + f + '")'; }

  function boot() {
    var host = document.getElementById('tx-examples') || document.querySelector('.tx-examples');
    if (!host || host.dataset.txReady) return;

    var cmp    = host.querySelector('.tx-cmp');
    var base   = host.querySelector('.tx-cmp-base');
    var normal = host.querySelector('.tx-cmp-normal');
    var handle = host.querySelector('.tx-cmp-handle');
    var tagL   = host.querySelector('.tx-cmp-tag-left');
    var tagR   = host.querySelector('.tx-cmp-tag-right');
    var thumbs = [].slice.call(host.querySelectorAll('.tx-tex-thumb'));

    /* If the Designer structure isn't there, do nothing rather than half-build
       something. Silent no-op beats a broken hybrid. */
    if (!cmp || !base || !normal || !handle || thumbs.length !== FABRICS.length) return;
    host.dataset.txReady = '1';

    /* The seam is a real control, so expose it as one. */
    cmp.setAttribute('role', 'slider');
    cmp.setAttribute('tabindex', '0');
    cmp.setAttribute('aria-label', 'Wipe between the base colour and the normal map');
    cmp.setAttribute('aria-valuemin', '0');
    cmp.setAttribute('aria-valuemax', '100');

    thumbs.forEach(function (t, i) {
      t.setAttribute('role', 'button');
      t.setAttribute('tabindex', '0');
      t.setAttribute('aria-label', 'Show ' + FABRICS[i].name);
      t.title = FABRICS[i].name;
    });

    var split = SPLIT;

    function paint() {
      /* inset() reads (top right bottom left), so a LEFT inset of `split`
         reveals the normal layer to the right of the seam. */
      var clip = 'inset(0 0 0 ' + split + '%)';
      normal.style.clipPath = clip;
      normal.style.webkitClipPath = clip;
      handle.style.left = split + '%';
      cmp.setAttribute('aria-valuenow', Math.round(split));
      if (tagL) tagL.style.opacity = split < 18 ? '0' : '1';   // fade a caption
      if (tagR) tagR.style.opacity = split > 82 ? '0' : '1';   // as the seam eats it
    }

    function select(i) {
      var f = FABRICS[i];
      base.style.backgroundImage = url(f.base);
      normal.style.backgroundImage = url(f.normal);
      thumbs.forEach(function (t, j) { t.classList.toggle('is-active', i === j); });
      cmp.dataset.fabric = f.name;
    }

    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { select(i); e.preventDefault(); }
      });
    });

    /* ---------- drag ---------- */
    var dragging = false;

    function setFromX(clientX) {
      var r = cmp.getBoundingClientRect();
      split = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
      paint();
    }

    /* Grab the seam from anywhere on the image. Hunting for a 2px handle with a
       thumb is miserable. setPointerCapture keeps the drag alive once the
       finger wanders outside the element. */
    cmp.addEventListener('pointerdown', function (e) {
      dragging = true;
      try { cmp.setPointerCapture(e.pointerId); } catch (_) {}
      cmp.classList.add('is-dragging');
      setFromX(e.clientX);
      e.preventDefault();
    });
    cmp.addEventListener('pointermove', function (e) { if (dragging) setFromX(e.clientX); });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      cmp.classList.remove('is-dragging');
      try { cmp.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    cmp.addEventListener('pointerup', end);
    cmp.addEventListener('pointercancel', end);

    cmp.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft')  { split = Math.max(0, split - step);   paint(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { split = Math.min(100, split + step); paint(); e.preventDefault(); }
      if (e.key === 'Home')       { split = 0;   paint(); e.preventDefault(); }
      if (e.key === 'End')        { split = 100; paint(); e.preventDefault(); }
    });

    paint();

    /* Preload every map once the section scrolls in, so switching fabrics is
       instant instead of a flash of empty box on mobile data. ~2.7MB total. */
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        FABRICS.forEach(function (f) {
          [f.base, f.normal].forEach(function (p) { var im = new Image(); im.src = CDN + p; });
        });
      }, { threshold: 0.15 });
      io.observe(host);
    }
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
})();
