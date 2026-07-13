/* ============================================================================
   TEXTYL — scan section: real product demo video
   Mounts into <div id="tx-scan"> on both the pitch deck and the website.

   This module used to render a stylised 3D "phone scanning fabric" scene. It
   now plays a real screen recording of the designer tool. The 3D version is
   preserved in git history (git show <older-commit>:scan-anim.js) if it is ever
   wanted again. The filename is kept as scan-anim.js on purpose: both surfaces
   already load this module and mount #tx-scan, so swapping the CONTENTS means
   no deck-bundler edit and no website footer change — just push and cache-bust.

   Playback rules, and why:
     muted + playsinline   browsers block UNMUTED autoplay; without these it
                           never starts on its own. Design the demo to read
                           silent (captions), because it plays muted.
     no loop               plays once, exactly like the animation it replaces.
     deck  -> plays when its slide gains data-deck-active, resets on leave, so
              flipping back to the slide replays it from the top.
     site  -> plays when scrolled into view; re-arms after it leaves.
   ========================================================================= */

const VIDEO  = new URL('demo.mp4', import.meta.url).href;
const POSTER = new URL('demo-poster.webp', import.meta.url).href;   // optional; see below

const CSS =
  '#tx-scan{position:relative;width:100%;height:100%;min-height:480px;overflow:hidden;border-radius:inherit}' +
  '#tx-scan .tx-demo{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;' +
    'background:#0b1416;display:block}';

function ensureCss() {
  if (document.getElementById('tx-demo-css')) return;
  const st = document.createElement('style');
  st.id = 'tx-demo-css';
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);
}

function boot() {
  const host = document.getElementById('tx-scan');
  if (!host || host.dataset.txDemo) return;
  host.dataset.txDemo = '1';
  ensureCss();
  host.innerHTML = '';

  const v = document.createElement('video');
  v.className = 'tx-demo';
  v.src = VIDEO;
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');          // iOS wants the attribute, not just the property
  v.setAttribute('webkit-playsinline', '');
  v.loop = false;
  v.preload = 'auto';
  v.controls = false;
  /* Poster is optional. If demo-poster.webp isn't pushed the attribute 404s and
     the browser just shows the first video frame once metadata loads. Grab one
     with:  ffmpeg -i demo.mp4 -vf "select=eq(n\\,0)" -q:v 3 demo-poster.webp  */
  v.setAttribute('poster', POSTER);
  host.appendChild(v);

  function playFromStart() {
    try { v.currentTime = 0; } catch (e) {}
    const p = v.play();
    if (p && p.catch) p.catch(() => {});        // swallow autoplay rejections
  }
  function reset() {
    try { v.pause(); v.currentTime = 0; } catch (e) {}
  }

  const slideEl = host.closest('section[data-label]');   // present in the deck, null on the site

  if (slideEl) {
    /* DECK: the deck's own media watcher already PAUSES videos that aren't on
       the active slide, so this only has to START on entry and reset on exit.
       MutationObserver fires only on the attribute CHANGE, so re-entering the
       slide replays from the top and it never restarts mid-play. */
    const sync = () => {
      if (slideEl.hasAttribute('data-deck-active')) playFromStart();
      else reset();
    };
    try { new MutationObserver(sync).observe(slideEl, { attributes: true, attributeFilter: ['data-deck-active'] }); } catch (e) {}
    sync();
  } else {
    /* SITE: play when the section scrolls into view; re-arm once it fully
       leaves, so scrolling back to it plays it again. */
    let armed = true;
    try {
      new IntersectionObserver((en) => {
        const r = en[0].intersectionRatio;
        if (r >= 0.4 && armed) { armed = false; playFromStart(); }
        else if (r <= 0.01) { armed = true; }
      }, { threshold: [0, 0.01, 0.4] }).observe(host);
    } catch (e) {
      playFromStart();                          // no IO support: just play
    }
  }
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
