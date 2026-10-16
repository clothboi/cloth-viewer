// Textyl — shirt comparison (unedited photo vs Textyl PBR). Embeddable build.
// Mounts into #tx-viewer-canvas: two windows (one per shirt), a rotation dial and -/+ zoom.
// Wide hosts: windows side by side, controls below. Narrow hosts: windows stacked, controls between them.
// Touch: the windows never capture the finger, so the page scrolls over them; the dial and buttons rotate / zoom.
// Optional labels on the mount: data-label-a / data-sub-a / data-label-b / data-sub-b.
// One WebGL canvas behind both windows, drawn with scissor viewports (mobile GPUs choke on extra contexts).
// esm.sh resolves the addons' bare `three` import to the same build, so all three share one instance (no import map needed).
import * as THREE from 'https://esm.sh/three@0.160.0';
import { GLTFLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'https://esm.sh/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';

const MOUNT_ID = 'tx-viewer-canvas';
const _app = document.getElementById(MOUNT_ID);
if (!_app) console.warn('[textyl-comparison] #' + MOUNT_ID + ' not found');
else init(_app);

function init(app) {
  const ASSET = (p) => new URL('shirt-comparison/' + p, import.meta.url).href;
  // Scale, from r4_052498_input.json. The CLO GLB UVs are in millimetres.
  // Real size: Textyl tile = apply.tile_mm 18.81 mm (72 ends x 0.2613 mm); photo = 724 px crop of a 1024 px / 133.8 mm frame (camera.frame_mm) = 94.6 mm.
  // Shown at FABRIC_ZOOM x real size so the weave reads on screen (Joshua 2026-10-16: 4x). Both shirts get the same factor.
  const FABRIC_ZOOM = 4;
  const TILE_MM = 18.81 * FABRIC_ZOOM, PHOTO_MM = 94.6 * FABRIC_ZOOM;
  const SEP = 6;
  const NORMAL_STRENGTH = 2.5;   // Textyl normal map strength (was 0.5)
  if (getComputedStyle(app).position === 'static') app.style.position = 'relative';
  const D = app.dataset;
  const isTouch = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;

  // ---------- UI (scoped) ----------
  const css = `
  #${MOUNT_ID} .txc-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;z-index:0}
  #${MOUNT_ID} .txc-wrap{position:absolute;inset:0;z-index:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:minmax(0,1fr) auto;gap:12px;box-sizing:border-box;font-family:'Inter',system-ui,sans-serif}
  #${MOUNT_ID} .txc-win{position:relative;min-width:0;min-height:0;border-radius:14px;border:1px solid rgba(243,239,231,.16);background:rgba(255,255,255,.03);box-sizing:border-box;touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none}
  #${MOUNT_ID}.txc-touch .txc-win{cursor:default}
  #${MOUNT_ID} .txc-win.txc-drag{cursor:grabbing}
  #${MOUNT_ID} .txc-label{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-weight:600;font-size:clamp(13px,1.4vw,17px);letter-spacing:.02em;color:#F3EFE7;pointer-events:none;opacity:0;transition:opacity .5s;text-shadow:0 1px 6px rgba(0,0,0,.45)}
  #${MOUNT_ID} .txc-label .txc-sub{display:block;margin-top:2px;font-weight:400;font-size:.72em;color:rgba(243,239,231,.55)}
  #${MOUNT_ID} .txc-label.txc-seam{color:#3FBF93}
  #${MOUNT_ID} .txc-ctrl{grid-column:1 / span 2;grid-row:2;display:flex;align-items:center;justify-content:center;gap:clamp(14px,3vw,34px);height:64px;opacity:0;transition:opacity .5s}
  /* controls match the site header: an inset tray (.tx-nav-pill) holding raised glossy teal buttons (.tx-nav-link) */
  #${MOUNT_ID} .txc-tray{display:flex;align-items:center;gap:4px;padding:4px;border-radius:999px;background-color:rgba(188,226,237,.10);border:1px solid rgba(0,0,0,.10);
    -webkit-backdrop-filter:blur(15px);backdrop-filter:blur(15px);box-shadow:inset 0 2px 4px rgba(0,0,0,.45),inset 0 -1px 0 rgba(255,255,255,.06)}
  #${MOUNT_ID} .txc-dial{position:relative;width:clamp(150px,22vw,230px);height:30px;border-radius:999px;touch-action:none;cursor:grab;outline:none;overflow:hidden;
    background:radial-gradient(140% 50% at 50% 0,rgba(255,255,255,.55) 0%,rgba(255,255,255,.30) 6%,rgba(255,255,255,.10) 18%,transparent 40%),radial-gradient(140% 45% at 50% 100%,rgba(255,255,255,.14) 0%,transparent 50%),linear-gradient(#5b6563 0%,#434d4b 30%,#3a4342 60%,#202726 100%);
    border:1px solid rgba(160,172,169,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -1px 0 rgba(0,0,0,.5),0 2px 4px rgba(0,0,0,.55),0 5px 14px rgba(0,0,0,.35);
    transition:transform .15s,filter .15s,box-shadow .15s}
  #${MOUNT_ID} .txc-dial:hover{filter:brightness(1.06)}
  #${MOUNT_ID} .txc-dial.txc-press{cursor:grabbing;filter:brightness(.94);transform:translateY(1px);
    box-shadow:inset 0 2px 5px rgba(0,0,0,.45),inset 0 -1px 0 rgba(255,255,255,.18),0 1px 1px rgba(0,0,0,.25)}
  #${MOUNT_ID} .txc-dial canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 18%,#000 82%,transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 18%,#000 82%,transparent 100%)}
  #${MOUNT_ID} .txc-notch{position:absolute;left:50%;top:7px;bottom:7px;width:1.5px;margin-left:-.75px;border-radius:1px;background:#F3EFE7;box-shadow:0 0 5px rgba(243,239,231,.6),0 0 0 .5px rgba(0,0,0,.25);pointer-events:none}
  #${MOUNT_ID} .txc-zoom{display:flex;align-items:center;gap:4px;touch-action:manipulation}
  #${MOUNT_ID} .txc-zb{width:30px;height:30px;border-radius:999px;padding:0 0 1px;display:flex;align-items:center;justify-content:center;cursor:pointer;appearance:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
    color:#F3EFE7;font:500 17px/1 'Inter',system-ui,sans-serif;text-shadow:0 -1px 0 rgba(0,0,0,.45);
    background:radial-gradient(140% 50% at 50% 0,rgba(255,255,255,.75) 0%,rgba(255,255,255,.55) 5%,rgba(255,255,255,.25) 13%,rgba(255,255,255,.08) 28%,transparent 42%),radial-gradient(140% 45% at 50% 100%,rgba(255,255,255,.18) 0%,transparent 50%),linear-gradient(#4a8e9a 0%,#3a7783 30%,#356f7c 60%,#1d4a55 100%);
    border:1px solid rgba(60,150,170,.6);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -1px 0 rgba(0,0,0,.5),0 2px 4px rgba(0,0,0,.55),0 5px 14px rgba(0,0,0,.35);
    transition:transform .15s,filter .15s,box-shadow .15s}
  #${MOUNT_ID} .txc-zb:hover:not(:disabled){filter:brightness(1.06) saturate(1.1);transform:translateY(-1px)}
  #${MOUNT_ID} .txc-zb:active:not(:disabled){filter:brightness(.92);transform:translateY(1px);
    background:radial-gradient(140% 45% at 50% 100%,rgba(255,255,255,.12) 0%,transparent 55%),linear-gradient(#18414b 0%,#295c66 60%,#336c77 100%);
    box-shadow:inset 0 2px 5px rgba(0,0,0,.55),inset 0 -1px 0 rgba(255,255,255,.18),0 1px 1px rgba(0,0,0,.25)}
  #${MOUNT_ID} .txc-zb:disabled{cursor:default;filter:saturate(.35) brightness(.75);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(0,0,0,.5),0 1px 2px rgba(0,0,0,.4)}
  #${MOUNT_ID} .txc-zi{width:14px;height:14px;opacity:.45;margin:0 2px}
  #${MOUNT_ID} .txc-dial:focus-visible,#${MOUNT_ID} .txc-zb:focus-visible{outline:1.5px solid rgba(243,239,231,.8);outline-offset:2px}
  #${MOUNT_ID} .txc-load{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;font-size:13px;color:rgba(243,239,231,.5);letter-spacing:.04em;transition:opacity .5s;pointer-events:none}
  #${MOUNT_ID}.txc-ready .txc-label,#${MOUNT_ID}.txc-ready .txc-ctrl{opacity:1}
  #${MOUNT_ID}.txc-stacked .txc-wrap{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) auto minmax(0,1fr);gap:8px}
  #${MOUNT_ID}.txc-stacked .txc-ctrl{grid-column:1;grid-row:2;height:auto;padding:2px 0}
  #${MOUNT_ID}.txc-stacked .txc-tray{width:100%;box-sizing:border-box}
  #${MOUNT_ID}.txc-stacked .txc-dial{flex:1 1 auto;width:auto;min-width:0;height:32px}
  #${MOUNT_ID}.txc-stacked .txc-zb{width:32px;height:32px}
  #${MOUNT_ID} .txc-a{grid-row:1;grid-column:1}
  #${MOUNT_ID} .txc-b{grid-row:1;grid-column:2}
  #${MOUNT_ID}.txc-stacked .txc-b{grid-row:3;grid-column:1}`;
  const styleEl = document.createElement('style'); styleEl.textContent = css; document.head.appendChild(styleEl);
  if (isTouch) app.classList.add('txc-touch');

  const canvas = document.createElement('canvas'); canvas.className = 'txc-canvas'; app.appendChild(canvas);
  const wrap = document.createElement('div'); wrap.className = 'txc-wrap'; app.appendChild(wrap);
  function win(label, sub, seam) {
    const w = document.createElement('div'); w.className = 'txc-win';
    const l = document.createElement('div'); l.className = 'txc-label' + (seam ? ' txc-seam' : '');
    l.textContent = label;
    if (sub) { const s = document.createElement('span'); s.className = 'txc-sub'; s.textContent = sub; l.appendChild(s); }
    w.appendChild(l); wrap.appendChild(w); return w;
  }
  const winA = win(D.labelA != null ? D.labelA : 'Default', D.subA != null ? D.subA : 'visible repeat', false);
  const ctrl = document.createElement('div'); ctrl.className = 'txc-ctrl';
  ctrl.innerHTML =
    '<div class="txc-tray">' +
    '<div class="txc-dial" role="slider" tabindex="0" aria-label="Rotate the shirts. Drag sideways or use the arrow keys" aria-valuemin="0" aria-valuemax="359" aria-valuenow="0">' +
      '<canvas aria-hidden="true"></canvas><span class="txc-notch" aria-hidden="true"></span>' +
    '</div>' +
    '<div class="txc-zoom">' +
      '<button type="button" class="txc-zb" data-z="-1" aria-label="Zoom out">&minus;</button>' +
      '<svg class="txc-zi" viewBox="0 0 24 24" fill="none" stroke="#F3EFE7" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M15 15l5.5 5.5"/></svg>' +
      '<button type="button" class="txc-zb" data-z="1" aria-label="Zoom in">+</button>' +
    '</div>' +
    '</div>';
  wrap.appendChild(ctrl);
  const winB = win(D.labelB != null ? D.labelB : 'Seamless', D.subB != null ? D.subB : 'Textyl', true);
  const wins = [winA, winB];
  winA.classList.add('txc-a'); winB.classList.add('txc-b');
  const dial = ctrl.querySelector('.txc-dial'), ridgeCv = dial.querySelector('canvas'), ridgeCtx = ridgeCv.getContext('2d');
  const zOut = ctrl.querySelector('[data-z="-1"]'), zIn = ctrl.querySelector('[data-z="1"]');
  const loadEl = document.createElement('div'); loadEl.className = 'txc-load'; loadEl.textContent = 'Loading…'; app.appendChild(loadEl);

  // ---------- renderer / scene ----------
  const lowPower = Math.min(window.innerWidth, window.innerHeight) < 700;
  const maxDPR = lowPower ? 1.5 : 2;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: lowPower ? 'default' : 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
  renderer.setScissorTest(true);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.error('[textyl-comparison] WebGL context lost (likely GPU memory)');
    const msg = document.createElement('div');
    msg.className = 'txc-load';
    msg.textContent = '3D preview unavailable on this device';
    app.appendChild(msg);
  }, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.useLegacyLights = true;   // r155+ changed light units; restore the r136 scale the standalone was tuned in (set before PMREM env)

  const scene = new THREE.Scene();
  const cams = [new THREE.PerspectiveCamera(30, 1, 0.1, 100), new THREE.PerspectiveCamera(30, 1, 0.1, 100)];

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 0.82); key.position.set(2.5, 3.5, 3.0); scene.add(key);
  const fill = new THREE.DirectionalLight(0xeaf2f0, 0.35); fill.position.set(-3, 1.5, 1.5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35); rim.position.set(0, 2, -4); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));

  // ---------- per-shirt wind + shared saturation ----------
  const windA = { value: 0 }, windB = { value: 0 }, satUniform = { value: 1.0 };
  const windAmp = { value: 1.0 };   // motion scale: 1 zoomed out, 0.1 fully zoomed in (set per frame from the zoom)
  function setupMaterial(mat, isFabric, windRef) {
    if (!mat || mat.userData._setup) return;
    mat.userData._setup = true;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWind = windRef;                       // wind on EVERY part (fabric + buttons + stitch)
      shader.uniforms.uWindAmp = windAmp;
      // displace in WORLD space (added in view space) so buttons on rotated/scaled nodes move with the fabric
      shader.vertexShader = 'uniform float uWind;\nuniform float uWindAmp;\n' + shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n' +
        'vec3 _wp = (modelMatrix * vec4(transformed, 1.0)).xyz;\n' +
        'float _wm = 1.0 - smoothstep(-0.62, 0.48, _wp.y);\n' +   // smooth shoulder->hem gradient
        'float _ph = _wp.y * 2.6 + _wp.x * 1.3;\n' +
        'vec3 _wind = vec3(sin(_ph + uWind * 1.45) * 0.005625, 0.0, sin(_ph * 0.8 + uWind * 1.15 + 1.7) * 0.004125) * _wm * uWindAmp;\n' +
        'gl_Position = projectionMatrix * (modelViewMatrix * vec4(transformed, 1.0) + viewMatrix * vec4(_wind, 0.0));\n'
      );
      if (isFabric) {
        shader.uniforms.uSat = satUniform;
        shader.fragmentShader = ('uniform float uSat;\n' + shader.fragmentShader).replace(
          '#include <map_fragment>',
          '#include <map_fragment>\n' +
          'float _l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));\n' +
          'diffuseColor.rgb = clamp(mix(vec3(_l), diffuseColor.rgb, uSat), 0.0, 1.0);\n'
        );
      }
    };
    mat.needsUpdate = true;
  }

  const TARGET_HEIGHT = 1.55;
  let shirtWidth = 1.0;
  function makeShirt(gltfScene, windRef) {
    const group = new THREE.Group();
    group.add(gltfScene);
    let box = new THREE.Box3().setFromObject(gltfScene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = TARGET_HEIGHT / size.y;
    gltfScene.scale.setScalar(s);
    gltfScene.position.sub(center.multiplyScalar(s));
    box = new THREE.Box3().setFromObject(gltfScene);
    shirtWidth = Math.max(shirtWidth, box.getSize(new THREE.Vector3()).x);
    gltfScene.traverse(o => {
      if (!o.isMesh || !o.material) return;
      o.frustumCulled = false;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => {
        m.side = THREE.DoubleSide;
        if ('envMapIntensity' in m) m.envMapIntensity = 0.30;
        const n = (m.name || '').toLowerCase();
        const isFabric = n.includes('fabric') || n.includes('gingham');
        if (isFabric) {
          m.transparent = false; m.depthWrite = true; m.alphaTest = 0;
          if (m.normalMap) m.normalScale.set(NORMAL_STRENGTH, NORMAL_STRENGTH);
          if (m.map) { m.map.anisotropy = 8; m.map.needsUpdate = true; }
        }
        setupMaterial(m, isFabric, windRef);
      });
    });
    return group;
  }

  const spin = { y: 0, x: 0 }, spinCur = { y: 0, x: 0 };
  let groups = [];

  function retexture(root, cfg) {
    root.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => {
        const n = (m.name || '').toLowerCase();
        if (!(n.includes('fabric') || n.includes('gingham'))) return;
        if (cfg.base && m.map) { m.map.image = cfg.base; m.map.needsUpdate = true; }
        if (cfg.tileMM) {                                             // CLO UVs are in mm: repeat = 1 / tile size in mm = true scale
          [m.map, m.normalMap, m.roughnessMap].forEach(t => { if (t) { t.repeat.set(1 / cfg.tileMM, 1 / cfg.tileMM); t.needsUpdate = true; } });
        }
        if (cfg.normal && m.normalMap) { m.normalMap.image = cfg.normal; m.normalMap.needsUpdate = true; }
        if (cfg.rough && m.roughnessMap) { m.roughnessMap.image = cfg.rough; m.roughnessMap.needsUpdate = true; m.roughness = 1.0; }
        if (cfg.sheen != null) {
          m.sheen = cfg.sheen;
          m.sheenColor = new THREE.Color(cfg.sheenColor != null ? cfg.sheenColor : 0xffffff);
          m.sheenRoughness = cfg.sheenRoughness != null ? cfg.sheenRoughness : 0.6;
        }
        m.needsUpdate = true;
      });
    });
  }

  // ---------- load assets ----------
  const gltf = new GLTFLoader();
  function loadGLB(url) { return new Promise((res, rej) => gltf.load(url, g => res(g.scene), undefined, rej)); }
  function loadImg(url) { return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = url; }); }

  Promise.all([
    loadGLB(ASSET('default.glb')), loadGLB(ASSET('seamless.glb')),
    loadImg(ASSET('r4_052498_input.webp')), loadImg(ASSET('r4_052498_base.webp')),
    loadImg(ASSET('r4_052498_normal.webp')), loadImg(ASSET('r4_052498_rough.webp'))
  ]).then(([a, b, defBase, seamBase, seamNormal, seamRough]) => {
    const gA = makeShirt(a, windA), gB = makeShirt(b, windB);
    retexture(a, { base: defBase, tileMM: PHOTO_MM });                                            // Default <- raw input
    retexture(b, { base: seamBase, normal: seamNormal, rough: seamRough, tileMM: TILE_MM, sheen: 0.25, sheenRoughness: 0.8 }); // Seamless
    gA.position.x = -SEP; gB.position.x = SEP;                      // far apart: each window's camera sees only its own shirt
    scene.add(gA, gB);
    groups = [gA, gB];
    layout();
    app.classList.add('txc-ready');
    loadEl.style.opacity = '0'; setTimeout(() => loadEl.remove(), 500);
  }).catch(err => {
    loadEl.textContent = 'Could not load: ' + (err && err.message || err);
    console.error('[textyl-comparison]', err);
  });

  // ---------- per-window camera framing + zoom ----------
  const LABEL_PX = 54;                 // room kept under each shirt for its label
  const ZOOM_STEPS = 5;                // -/+ steps from full shirt to close-up
  let zoomStep = 0, zoomT = 0, zoomCur = 0;
  const rects = [{ x: 0, y: 0, w: 1, h: 1 }, { x: 0, y: 0, w: 1, h: 1 }];
  let fitDist = [4, 4];
  function frame(i) {
    const r = rects[i], cam = cams[i];
    cam.aspect = r.w / Math.max(1, r.h); cam.updateProjectionMatrix();
    const vFov = cam.fov * Math.PI / 180;
    const usable = Math.max(0.3, (r.h - LABEL_PX) / r.h);          // fraction of the window height the shirt may use
    const distH = (TARGET_HEIGHT / 2) / Math.tan(vFov / 2) / usable;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
    const distW = (shirtWidth / 2) / Math.tan(hFov / 2);
    fitDist[i] = Math.max(distH, distW) * 1.06;
  }
  function placeCams() {
    for (let i = 0; i < 2; i++) {
      const cam = cams[i], x = i === 0 ? -SEP : SEP;
      const r = rects[i];
      const usable = Math.max(0.3, (r.h - LABEL_PX) / r.h);
      const dist = fitDist[i] * (1 - zoomCur * 0.86);              // fully zoomed: close enough to read the weave
      // zoomed out: lift the view so the shirt clears the label; zoomed in: aim at the chest
      const vH = 2 * dist * Math.tan(cam.fov * Math.PI / 360);
      const ty = -(1 - zoomCur) * (vH * (1 - usable) / 2) + zoomCur * 0.18;
      cam.position.set(x, ty, dist);
      cam.lookAt(x, ty, 0);
    }
  }
  function setZoom(step) {
    zoomStep = Math.max(0, Math.min(ZOOM_STEPS, step));
    zoomT = zoomStep / ZOOM_STEPS;
    zOut.disabled = zoomStep === 0; zIn.disabled = zoomStep === ZOOM_STEPS;
  }
  zOut.addEventListener('click', () => setZoom(zoomStep - 1));
  zIn.addEventListener('click', () => setZoom(zoomStep + 1));
  setZoom(0);

  // ---------- rotation: the dial (everywhere) + drag on a window (mouse / pen only) ----------
  const TAU = Math.PI * 2;
  // horizontal wheel: ridges sit on a drum, dragging moves them 1:1 under the finger, a flick keeps spinning
  let wheelDrag = false, wheelX = 0, wheelT = 0, wheelVel = 0;
  const drumR = () => dial.clientWidth * 0.42;
  dial.addEventListener('pointerdown', (e) => {
    wheelDrag = true; wheelVel = 0; wheelX = e.clientX; wheelT = performance.now();
    dial.setPointerCapture(e.pointerId); dial.classList.add('txc-press'); e.preventDefault();
  });
  dial.addEventListener('pointermove', (e) => {
    if (!wheelDrag) return;
    const now = performance.now(), da = (e.clientX - wheelX) / drumR();
    spin.y += da; spinCur.y += da;                                     // the wheel follows the finger exactly
    wheelVel = 0.8 * wheelVel + 0.2 * (da / Math.max(1, now - wheelT) * 16.7);
    wheelX = e.clientX; wheelT = now; e.preventDefault();
  });
  const wheelUp = () => { if (!wheelDrag) return; wheelDrag = false; dial.classList.remove('txc-press'); if (performance.now() - wheelT > 80) wheelVel = 0; };
  dial.addEventListener('pointerup', wheelUp); dial.addEventListener('pointercancel', wheelUp);
  dial.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowDown') { spin.y -= Math.PI / 12; e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'ArrowUp') { spin.y += Math.PI / 12; e.preventDefault(); }
    else if (k === 'Home') { spin.y = Math.round(spin.y / TAU) * TAU; e.preventDefault(); }
  });
  function sizeDial() {
    const d = Math.min(2, window.devicePixelRatio || 1);
    ridgeCv.width = Math.round(dial.clientWidth * d); ridgeCv.height = Math.round(dial.clientHeight * d);
    ridgeCtx.setTransform(d, 0, 0, d, 0, 0);
  }
  function drawDial() {
    const a = spinCur.y, W = dial.clientWidth, H = dial.clientHeight, cx = W / 2, R = drumR(), step = TAU / 60;
    ridgeCtx.clearRect(0, 0, W, H);
    const k0 = Math.ceil((-Math.PI / 2 - a) / step), k1 = Math.floor((Math.PI / 2 - a) / step);
    for (let k = k0; k <= k1; k++) {
      const th = k * step + a, c = Math.cos(th), x = cx + R * Math.sin(th);
      const w = 0.8 + 0.7 * c, h = H * (0.26 + 0.2 * c);
      ridgeCtx.fillStyle = 'rgba(10,14,13,' + (0.10 + 0.45 * c * c).toFixed(3) + ')';
      ridgeCtx.fillRect(x - w / 2, (H - h) / 2, w, h);
      ridgeCtx.fillStyle = 'rgba(243,239,231,' + (0.05 + 0.30 * c * c).toFixed(3) + ')';
      ridgeCtx.fillRect(x + w / 2, (H - h) / 2, 0.8, h);
    }
    dial.setAttribute('aria-valuenow', String(Math.round(((a % TAU) + TAU) % TAU * 180 / Math.PI)));
  }

  let dragging = null, lastX = 0, lastY = 0;
  wins.forEach(w => {
    w.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;                         // fingers scroll the page; rotate with the dial
      dragging = w; w.classList.add('txc-drag'); lastX = e.clientX; lastY = e.clientY;
      w.setPointerCapture(e.pointerId); e.preventDefault();
    });
    w.addEventListener('pointermove', (e) => {
      if (dragging !== w) return;
      spin.y += (e.clientX - lastX) * 0.011;
      spin.x = Math.max(-0.6, Math.min(0.6, spin.x + (e.clientY - lastY) * 0.006));
      lastX = e.clientX; lastY = e.clientY;
    });
    const end = () => { if (dragging === w) { dragging = null; w.classList.remove('txc-drag'); } };
    w.addEventListener('pointerup', end); w.addEventListener('pointercancel', end);
  });

  // ---------- sizing ----------
  // offsetLeft/Top are layout pixels, unaffected by CSS transforms (the pitch deck scales its slides)
  function measure() {
    for (let i = 0; i < 2; i++) {
      const w = wins[i];
      let x = 0, y = 0, el = w;
      while (el && el !== app) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
      rects[i] = { x: x + 1, y: y + 1, w: Math.max(1, w.clientWidth), h: Math.max(1, w.clientHeight) };
    }
  }
  let stacked = false;
  // Narrow hosts stack the windows. Each window keeps the desktop window's shape (WIN_RATIO = width / height),
  // so the viewer grows taller instead of squashing the shirts; it sizes its own host (and a fixed-height parent card).
  const WIN_RATIO = 0.83, STACK_BELOW = 600, CTRL_H = 48, GAP = 8;
  const hostParent = app.parentElement;
  function layout() {
    const W = app.clientWidth || 600;
    const st = W < STACK_BELOW;
    if (st !== stacked) { stacked = st; app.classList.toggle('txc-stacked', stacked); }
    if (stacked) {
      const want = Math.round(2 * (W / WIN_RATIO) + CTRL_H + 2 * GAP);
      if (Math.abs(app.clientHeight - want) > 1) app.style.height = want + 'px';
      if (hostParent && hostParent.clientHeight < want) hostParent.style.height = 'auto';
    } else if (app.style.height) {
      app.style.height = ''; if (hostParent) hostParent.style.height = '';
    }
    const H = Math.max(240, Math.min(app.clientHeight || 400, Math.round(window.innerHeight * 3)));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
    renderer.setSize(W, H, false);
    measure();
    frame(0); frame(1); placeCams();
    sizeDial();
  }
  if (window.ResizeObserver) new ResizeObserver(layout).observe(app);
  window.addEventListener('resize', layout);
  layout();

  // ---------- render only while on-screen ----------
  let visible = true;
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(app);
  const slideEl = app.closest('section[data-label]');
  const slideActive = () => !slideEl || slideEl.hasAttribute('data-deck-active');

  const clock = new THREE.Clock();
  let windT = 0;
  function tick() {
    requestAnimationFrame(tick);
    if (!visible || !slideActive() || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(0.1, clock.getDelta());
    windT += dt;
    windA.value = windT;
    windB.value = windT + 7.3;                 // phase-offset shirt 2 so the pair doesn't sway in sync
    if (!wheelDrag && Math.abs(wheelVel) > 1e-4) { spin.y += wheelVel; spinCur.y += wheelVel; wheelVel *= Math.pow(0.93, dt * 60); }
    spinCur.y += (spin.y - spinCur.y) * Math.min(1, dt * 8);
    spinCur.x += (spin.x - spinCur.x) * Math.min(1, dt * 8);
    zoomCur += (zoomT - zoomCur) * Math.min(1, dt * 7);
    windAmp.value = 1 - 0.9 * zoomCur;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const wv = (i === 0) ? windA.value : windB.value;
      g.rotation.y = spinCur.y;
      g.rotation.x = spinCur.x;
      g.rotation.z = Math.sin(wv * 0.9) * 0.011 * windAmp.value;
      g.position.y = Math.sin(wv * 0.7 + 1.0) * 0.015 * windAmp.value;
    }
    drawDial();
    placeCams();
    const Hc = canvas.height / renderer.getPixelRatio();
    renderer.setScissorTest(false); renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.setScissorTest(true);
    for (let i = 0; i < 2; i++) {
      const r = rects[i];
      const by = Hc - r.y - r.h;                                     // WebGL viewport origin is bottom-left
      renderer.setViewport(r.x, by, r.w - 2, r.h - 2);
      renderer.setScissor(r.x, by, r.w - 2, r.h - 2);
      renderer.render(scene, cams[i]);
    }
  }
  tick();
}
