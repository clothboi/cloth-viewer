// Textyl — shirt comparison (Default vs Seamless). Embeddable build.
// Mounts into #tx-viewer-canvas, transparent background, no dev chrome.
// Loads the two CLO garment GLBs + the madras PBR maps from ./shirt-comparison/.
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
  if (getComputedStyle(app).position === 'static') app.style.position = 'relative';

  // ---------- overlay UI (scoped) ----------
  const css = `
  .txc-canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}
  .txc-canvas.txc-drag{cursor:grabbing}
  .txc-label{position:absolute;transform:translate(-50%,0);text-align:center;font-family:'Inter',system-ui,sans-serif;font-weight:600;font-size:clamp(12px,1.4vw,17px);letter-spacing:.02em;color:#F3EFE7;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .5s}
  .txc-label .txc-sub{display:block;margin-top:2px;font-weight:400;font-size:.72em;color:rgba(243,239,231,.55)}
  .txc-label.txc-seam{color:#1D9E75}
  .txc-hint{position:absolute;left:50%;top:10px;transform:translateX(-50%);font-family:'Inter',system-ui,sans-serif;font-size:12px;color:rgba(243,239,231,.5);pointer-events:none;opacity:0;transition:opacity .5s}
  .txc-panel{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.08);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(243,239,231,.18);opacity:0;transition:opacity .5s}
  .txc-panel span{font-size:12px;color:rgba(243,239,231,.55);user-select:none}
  .txc-range{-webkit-appearance:none;appearance:none;width:clamp(110px,18vw,200px);height:4px;border-radius:4px;background:rgba(243,239,231,.18);outline:none;cursor:pointer}
  .txc-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:15px;height:15px;border-radius:50%;background:#1D9E75;border:2px solid #fff;cursor:pointer}
  .txc-range::-moz-range-thumb{width:15px;height:15px;border-radius:50%;background:#1D9E75;border:2px solid #fff;cursor:pointer}
  .txc-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Inter',system-ui,sans-serif;font-size:13px;color:rgba(243,239,231,.5);letter-spacing:.04em;transition:opacity .5s;pointer-events:none}
  .txc-ready .txc-label,.txc-ready .txc-hint,.txc-ready .txc-panel{opacity:1}`;
  const styleEl = document.createElement('style'); styleEl.textContent = css; document.head.appendChild(styleEl);

  const canvas = document.createElement('canvas'); canvas.className = 'txc-canvas'; app.appendChild(canvas);
  function mk(cls, t, sub) { const d = document.createElement('div'); d.className = cls; d.innerHTML = t + '<span class="txc-sub">' + sub + '</span>'; app.appendChild(d); return d; }
  const lblA = mk('txc-label', 'Default', 'visible repeat');
  const lblB = mk('txc-label txc-seam', 'Seamless', 'Textyl');
  const hint = document.createElement('div'); hint.className = 'txc-hint'; hint.textContent = 'Drag to rotate'; app.appendChild(hint);
  const panel = document.createElement('div'); panel.className = 'txc-panel';
  panel.innerHTML = '<span>–</span><input type="range" class="txc-range" min="0" max="100" value="0" aria-label="Zoom"><span>+</span>';
  app.appendChild(panel);
  const zoomInput = panel.querySelector('.txc-range');
  const loadEl = document.createElement('div'); loadEl.className = 'txc-load'; loadEl.textContent = 'Loading…'; app.appendChild(loadEl);

  // ---------- renderer / scene ----------
  // Two three.js renderers share this page (scan-anim is the other). Mobile GPUs run out of
  // memory with MSAA + 2x DPR on both, and the lost context is silent, so trim + surface it.
  const lowPower = Math.min(window.innerWidth, window.innerHeight) < 700;
  const maxDPR = lowPower ? 1.5 : 2;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: lowPower ? 'default' : 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
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
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const camTarget = new THREE.Vector3(0, 0, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 0.82); key.position.set(2.5, 3.5, 3.0); scene.add(key);
  const fill = new THREE.DirectionalLight(0xeaf2f0, 0.35); fill.position.set(-3, 1.5, 1.5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35); rim.position.set(0, 2, -4); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.05));

  // ---------- per-shirt wind + shared saturation ----------
  const windA = { value: 0 }, windB = { value: 0 }, satUniform = { value: 1.0 };
  function setupMaterial(mat, isFabric, windRef) {
    if (!mat || mat.userData._setup) return;
    mat.userData._setup = true;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWind = windRef;                       // wind on EVERY part (fabric + buttons + stitch)
      // displace in WORLD space (added in view space) so buttons on rotated/scaled nodes move with the fabric
      shader.vertexShader = 'uniform float uWind;\n' + shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n' +
        'vec3 _wp = (modelMatrix * vec4(transformed, 1.0)).xyz;\n' +
        'float _wm = 1.0 - smoothstep(-0.62, 0.48, _wp.y);\n' +   // smooth shoulder->hem gradient
        'float _ph = _wp.y * 2.6 + _wp.x * 1.3;\n' +
        'vec3 _wind = vec3(sin(_ph + uWind * 1.45) * 0.005625, 0.0, sin(_ph * 0.8 + uWind * 1.15 + 1.7) * 0.004125) * _wm;\n' +
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
          if (m.normalMap) m.normalScale.set(0.5, 0.5);
          if (m.map) { m.map.anisotropy = 8; m.map.needsUpdate = true; }
          [m.map, m.normalMap, m.roughnessMap].forEach(t => {           // scale texture mapping to 1.25
            if (t && !t._scaled) { t.repeat.multiplyScalar(1.25); t._scaled = true; t.needsUpdate = true; }
          });
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
    loadImg(ASSET('madras_input.webp')), loadImg(ASSET('madras_base.webp')),
    loadImg(ASSET('madras_normal.webp')), loadImg(ASSET('madras_rough.webp'))
  ]).then(([a, b, defBase, seamBase, seamNormal, seamRough]) => {
    const gA = makeShirt(a, windA), gB = makeShirt(b, windB);
    retexture(a, { base: defBase });                                            // Default <- raw input
    retexture(b, { base: seamBase, normal: seamNormal, rough: seamRough, sheen: 0.7, sheenRoughness: 0.7 }); // Seamless
    scene.add(gA, gB);
    groups = [gA, gB];
    frameCameraToContent();
    app.classList.add('txc-ready');
    loadEl.style.opacity = '0'; setTimeout(() => loadEl.remove(), 500);
  }).catch(err => {
    loadEl.textContent = 'Could not load: ' + (err && err.message || err);
    console.error('[textyl-comparison]', err);
  });

  // ---------- camera framing + zoom (default = most zoomed-out; zoom in converges) ----------
  let fitDist = 6, zoomT = 0;
  let stacked = false;                  // narrow / portrait canvases stack the shirts vertically
  const DX_OUT = 0.625, DX_IN = 0.50;   // side-by-side separation (x, in shirtWidth units)
  const DY_OUT = 0.70, DY_IN = 0.62;    // stacked separation (y, in TARGET_HEIGHT units)
  function frameCameraToContent() {
    const vFov = camera.fov * Math.PI / 180;
    let contentW, contentH;
    if (stacked) {
      contentW = shirtWidth * 1.06;
      contentH = TARGET_HEIGHT * (2 * DY_OUT + 1) + 0.30;   // stack span + room for the labels
    } else {
      contentW = (shirtWidth * DX_OUT + shirtWidth / 2) * 2;
      contentH = TARGET_HEIGHT;
    }
    const distH = (contentH / 2) / Math.tan(vFov / 2);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distW = (contentW / 2) / Math.tan(hFov / 2);
    fitDist = Math.max(distH, distW) * 1.12;
    applyZoom();
  }
  function applyZoom() {
    const dist = fitDist * (1 - zoomT * 0.55);
    camera.position.set(0, 0, dist);
    camera.lookAt(camTarget);
    if (stacked) {
      const dy = TARGET_HEIGHT * (DY_OUT - (DY_OUT - DY_IN) * zoomT);
      if (groups[0]) { groups[0].position.x = 0; groups[0].userData.baseY = dy; }
      if (groups[1]) { groups[1].position.x = 0; groups[1].userData.baseY = -dy; }
    } else {
      const dx = shirtWidth * (DX_OUT - (DX_OUT - DX_IN) * zoomT);
      if (groups[0]) { groups[0].position.x = -dx; groups[0].userData.baseY = 0; }
      if (groups[1]) { groups[1].position.x = dx; groups[1].userData.baseY = 0; }
    }
  }
  zoomInput.addEventListener('input', e => { zoomT = (+e.target.value) / 100; applyZoom(); });

  // ---------- drag to spin both on their own axis ----------
  let dragging = false, lastX = 0, lastY = 0;
  function down(e) { dragging = true; canvas.classList.add('txc-drag'); const p = e.touches ? e.touches[0] : e; lastX = p.clientX; lastY = p.clientY; }
  function moveH(e) {
    if (!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    spin.y += (p.clientX - lastX) * 0.011;
    spin.x += (p.clientY - lastY) * 0.006;
    spin.x = Math.max(-0.6, Math.min(0.6, spin.x));
    lastX = p.clientX; lastY = p.clientY;
    if (e.cancelable) e.preventDefault();
  }
  function up() { dragging = false; canvas.classList.remove('txc-drag'); }
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', moveH, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);

  // ---------- labels ----------
  const _v = new THREE.Vector3();
  function placeLabel(el, group) {
    if (!group) return;
    _v.set(group.position.x, group.position.y - TARGET_HEIGHT / 2 - 0.12, 0).project(camera);
    el.style.left = ((_v.x * 0.5 + 0.5) * app.clientWidth) + 'px';
    el.style.top = ((-_v.y * 0.5 + 0.5) * app.clientHeight) + 'px';
  }

  // ---------- sizing ----------
  function resize() {
    const w = app.clientWidth || 600, h = app.clientHeight || 400;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    stacked = (w / h) < 0.95;   // portrait / narrow canvas -> stack the two shirts instead of side-by-side
    frameCameraToContent();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(app);
  window.addEventListener('resize', resize);
  resize();

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
    const dt = clock.getDelta();
    windT += dt;
    windA.value = windT;
    windB.value = windT + 7.3;                 // phase-offset shirt 2 so the pair doesn't sway in sync
    spinCur.y += (spin.y - spinCur.y) * Math.min(1, dt * 8);
    spinCur.x += (spin.x - spinCur.x) * Math.min(1, dt * 8);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const wv = (i === 0) ? windA.value : windB.value;
      g.rotation.y = spinCur.y;
      g.rotation.x = spinCur.x;
      g.rotation.z = Math.sin(wv * 0.9) * 0.011;
      g.position.y = (g.userData.baseY || 0) + Math.sin(wv * 0.7 + 1.0) * 0.015;   // keep the stacked offset, add the wind bob
    }
    placeLabel(lblA, groups[0]);
    placeLabel(lblB, groups[1]);
    renderer.render(scene, camera);
  }
  tick();
}
