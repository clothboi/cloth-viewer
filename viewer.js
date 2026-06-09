// Textyl cloth viewer — embeddable build.
// Mounts into #tx-viewer-canvas, transparent background, no dev UI.
// Fabric swap is driven by any element on the page with a [data-fabric] attribute.
import * as THREE from 'three';

const MOUNT_ID = 'tx-viewer-canvas';
const app = document.getElementById(MOUNT_ID);
if (!app) {
  console.warn('[textyl-viewer] #' + MOUNT_ID + ' not found');
} else {
  init(app);
}

function init(app) {
  // ---------- config (final tuned values) ----------
  const X_SEGS = 36, Y_SEGS = 36;
  const REST = 0.16, MASS = 0.1;
  const GRAVITY = new THREE.Vector3(0, -4.0, 0).multiplyScalar(MASS);
  const FRICTION = 0.75;
  const TIMESTEP = 18 / 1000, TIMESTEP_SQ = TIMESTEP * TIMESTEP;
  const DRAG = 0.06, CONSTRAINT_ITER = 18, SUBSTEPS = 3;
  const SPHERE_R = 1.5, SPHERE_C = new THREE.Vector3(0, 0, 0);
  const SKIN_OFFSET = 0.1, PIN_LIFT = 0.1;
  const BEND = true, BEND_STIFF = 0.25;
  const FLOOR_Y = -2.2, START_Y = 2.0;
  const SPIN_SENS = 0.0002, SPIN_DECAY = 0.94, SPIN_MAX = 0.15;
  const AUTO_ROT = 0.000075, AIR_SPIN = 0.6, WIND_SCALE = 0.05;
  const SMOOTH_ITERS = 2, SMOOTH_LAMBDA = 0.5, TILES = 4;
  const WIND_ON = true;

  const CDN = 'https://cdn.prod.website-files.com/6a0979ff745bb701c7a098de/';
  const FABRICS = {
    denim:       { file: '6a281f964dc2ec4183c3c4d2_denim_0039.png',       bend: 0.25 },
    twill:       { file: '6a282069fae9b8afd8fbec24_twill_0890.png',       bend: 0.10 },
    plain:       { file: '6a28202577b9144a53e8da4b_plain_0902.png',       bend: 0.08 },
    houndstooth: { file: '6a28200e12e91bf04af2691c_houndstooth_1594.png', bend: 0.08 },
    gingham:     { file: '6a281fe88b34465293d32c12_gingham_1112.png',     bend: 0.08 },
    madras:      { file: '6a281fcf86f15756a04e71bd_madras_1911.png',      bend: 0.25 },
  };
  const DEFAULT_FABRIC = 'denim';

  // ---------- renderer / scene / camera ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);   // transparent -> blends with the page section
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = 'pan-y';   // vertical scroll passes through; horizontal drag spins
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x10353c, 9, 20);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.3, 6.6);
  const target = new THREE.Vector3(0, 0.25, 0);
  camera.lookAt(target);

  function size() {
    const w = app.clientWidth || 600;
    const h = app.clientHeight || 600;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  size();
  new ResizeObserver(size).observe(app);

  // ---------- lights: three-point ----------
  scene.add(new THREE.HemisphereLight(0xdfe7e4, 0x0a2025, 0.18));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-4.5, 5, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1; key.shadow.camera.far = 25;
  key.shadow.camera.left = -6; key.shadow.camera.right = 6;
  key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(5, 2.5, 4);
  scene.add(fill);
  const back = new THREE.DirectionalLight(0x3fe3ee, 0.7);
  back.position.set(-1.5, 2, -6);
  scene.add(back);

  // ---------- sphere + contact-shadow floor ----------
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_R, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0x214a52, roughness: 0.85, metalness: 0.0 })
  );
  sphere.castShadow = true; sphere.receiveShadow = true;
  scene.add(sphere);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.35 })   // only the shadow shows; no visible disc
  );
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- cloth (Verlet) ----------
  function startPos(u, v) {
    return new THREE.Vector3((u - X_SEGS / 2) * REST, START_Y, (v - Y_SEGS / 2) * REST);
  }
  class Particle {
    constructor(u, v) {
      this.position = startPos(u, v);
      this.previous = this.position.clone();
      this.a = new THREE.Vector3();
      this.pinned = false;
    }
    addForce(f) { this.a.addScaledVector(f, 1 / MASS); }
    integrate() {
      if (this.pinned) { this.a.set(0, 0, 0); return; }
      const cur = this.position;
      const next = cur.clone()
        .addScaledVector(cur.clone().sub(this.previous), 1 - DRAG)
        .addScaledVector(this.a, TIMESTEP_SQ);
      this.previous.copy(cur);
      this.position.copy(next);
      this.a.set(0, 0, 0);
    }
  }

  const particles = [];
  const constraints = [];
  const bendList = [];
  const idx = (u, v) => u + v * (X_SEGS + 1);
  for (let v = 0; v <= Y_SEGS; v++)
    for (let u = 0; u <= X_SEGS; u++)
      particles.push(new Particle(u, v));

  let pinOn = true;
  const PIN_RADIUS = 1;
  const pinnedCap = [];
  function applyPin() {
    const cu = X_SEGS >> 1, cv = Y_SEGS >> 1;
    for (const p of particles) p.pinned = false;
    pinnedCap.length = 0;
    if (!pinOn) return;
    const surf = SPHERE_R + PIN_LIFT;
    for (let dv = -PIN_RADIUS; dv <= PIN_RADIUS; dv++)
      for (let du = -PIN_RADIUS; du <= PIN_RADIUS; du++) {
        const part = particles[idx(cu + du, cv + dv)];
        const x = du * REST, z = dv * REST;
        const y = Math.sqrt(Math.max(0, surf * surf - x * x - z * z));
        part.pinned = true;
        const base = new THREE.Vector3(x, y, z);
        part.position.copy(base); part.previous.copy(base);
        pinnedCap.push({ part, base });
      }
  }
  function updatePinSpin(angle) {
    if (!pinOn) return;
    const c = Math.cos(angle), s = Math.sin(angle);
    for (const { part, base } of pinnedCap) {
      part.position.set(base.x * c - base.z * s, base.y, base.x * s + base.z * c);
      part.previous.copy(part.position);
    }
  }
  function addConstraint(a, b, stiff = 1) {
    const dist = particles[a].position.distanceTo(particles[b].position);
    const cc = [particles[a], particles[b], dist, stiff];
    constraints.push(cc);
    return cc;
  }
  for (let v = 0; v <= Y_SEGS; v++)
    for (let u = 0; u <= X_SEGS; u++) {
      if (u < X_SEGS) addConstraint(idx(u, v), idx(u + 1, v));
      if (v < Y_SEGS) addConstraint(idx(u, v), idx(u, v + 1));
      if (u < X_SEGS && v < Y_SEGS) {
        addConstraint(idx(u, v), idx(u + 1, v + 1));
        addConstraint(idx(u + 1, v), idx(u, v + 1));
      }
      if (BEND && u < X_SEGS - 1) bendList.push(addConstraint(idx(u, v), idx(u + 2, v), BEND_STIFF));
      if (BEND && v < Y_SEGS - 1) bendList.push(addConstraint(idx(u, v), idx(u, v + 2), BEND_STIFF));
    }
  applyPin();

  const diff = new THREE.Vector3();
  function satisfy(a, b, dist, stiff) {
    diff.subVectors(b.position, a.position);
    const len = diff.length();
    if (len === 0) return;
    const corr = diff.multiplyScalar((1 - dist / len) * stiff);
    const aP = a.pinned, bP = b.pinned;
    if (aP && bP) return;
    if (aP) { b.position.sub(corr); }
    else if (bP) { a.position.add(corr); }
    else { a.position.addScaledVector(corr, 0.5); b.position.addScaledVector(corr, -0.5); }
  }

  // ---------- cloth mesh ----------
  const clothGeo = new THREE.PlaneGeometry(1, 1, X_SEGS, Y_SEGS);
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0x2f5d8f, roughness: 0.75, metalness: 0.0, side: THREE.DoubleSide, flatShading: false,
    transparent: true, alphaTest: 0.5,   // respect the texture alpha channel
  });
  const clothMesh = new THREE.Mesh(clothGeo, clothMat);
  clothMesh.castShadow = true; clothMesh.receiveShadow = false;
  scene.add(clothMesh);
  const posAttr = clothGeo.attributes.position;
  const normAttr = clothGeo.attributes.normal;
  const smoothBuf = new Float32Array(posAttr.array.length);
  const _du = new THREE.Vector3(), _dv = new THREE.Vector3(), _nrm = new THREE.Vector3();

  function smoothPass() {
    const arr = posAttr.array;
    smoothBuf.set(arr);
    for (let v = 0; v <= Y_SEGS; v++)
      for (let u = 0; u <= X_SEGS; u++) {
        const i = idx(u, v) * 3;
        let sx = 0, sy = 0, sz = 0, n = 0;
        if (u > 0)      { const j = idx(u - 1, v) * 3; sx += smoothBuf[j]; sy += smoothBuf[j + 1]; sz += smoothBuf[j + 2]; n++; }
        if (u < X_SEGS) { const j = idx(u + 1, v) * 3; sx += smoothBuf[j]; sy += smoothBuf[j + 1]; sz += smoothBuf[j + 2]; n++; }
        if (v > 0)      { const j = idx(u, v - 1) * 3; sx += smoothBuf[j]; sy += smoothBuf[j + 1]; sz += smoothBuf[j + 2]; n++; }
        if (v < Y_SEGS) { const j = idx(u, v + 1) * 3; sx += smoothBuf[j]; sy += smoothBuf[j + 1]; sz += smoothBuf[j + 2]; n++; }
        if (!n) continue;
        const inv = 1 / n;
        arr[i]     += (sx * inv - smoothBuf[i])     * SMOOTH_LAMBDA;
        arr[i + 1] += (sy * inv - smoothBuf[i + 1]) * SMOOTH_LAMBDA;
        arr[i + 2] += (sz * inv - smoothBuf[i + 2]) * SMOOTH_LAMBDA;
      }
  }
  function computeGridNormals() {
    const a = posAttr.array;
    for (let v = 0; v <= Y_SEGS; v++)
      for (let u = 0; u <= X_SEGS; u++) {
        const iL = idx(Math.max(u - 1, 0), v) * 3;
        const iR = idx(Math.min(u + 1, X_SEGS), v) * 3;
        const iD = idx(u, Math.max(v - 1, 0)) * 3;
        const iU = idx(u, Math.min(v + 1, Y_SEGS)) * 3;
        _du.set(a[iR] - a[iL], a[iR + 1] - a[iL + 1], a[iR + 2] - a[iL + 2]);
        _dv.set(a[iU] - a[iD], a[iU + 1] - a[iD + 1], a[iU + 2] - a[iD + 2]);
        _nrm.crossVectors(_dv, _du).normalize();
        normAttr.setXYZ(idx(u, v), _nrm.x, _nrm.y, _nrm.z);
      }
    normAttr.needsUpdate = true;
  }
  function syncMesh() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i].position;
      posAttr.setXYZ(i, p.x, p.y, p.z);
    }
    for (let it = 0; it < SMOOTH_ITERS; it++) smoothPass();
    posAttr.needsUpdate = true;
    computeGridNormals();
    clothGeo.computeBoundingSphere();
  }

  // ---------- textures + swatch wiring ----------
  const texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin('anonymous');
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const texCache = {};
  function configureTex(t) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(TILES, TILES);
    t.anisotropy = maxAniso;
  }
  function setFabric(name) {
    const f = FABRICS[name];
    if (!f) return;
    for (const c of bendList) c[3] = f.bend;
    document.querySelectorAll('[data-fabric]').forEach((el) =>
      el.classList.toggle('is-active', el.dataset.fabric === name));
    const cached = texCache[f.file];
    if (cached) { clothMat.map = cached; clothMat.color.set(0xffffff); clothMat.needsUpdate = true; return; }
    texLoader.load(CDN + f.file, (tex) => {
      configureTex(tex);
      texCache[f.file] = tex;
      clothMat.map = tex; clothMat.color.set(0xffffff); clothMat.needsUpdate = true;
    });
  }
  document.querySelectorAll('[data-fabric]').forEach((el) => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => setFabric(el.dataset.fabric));
  });
  setFabric(DEFAULT_FABRIC);

  // ---------- drag to spin ----------
  let spinVel = 0, spinAngle = 0, dragging = false, lastX = 0;
  renderer.domElement.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    spinVel -= (e.clientX - lastX) * SPIN_SENS;
    spinVel = Math.max(-SPIN_MAX, Math.min(SPIN_MAX, spinVel));
    lastX = e.clientX;
  });
  window.addEventListener('pointerup', () => { dragging = false; });

  // ---------- zoom slider (vertical, pinned to right edge) ----------
  const ZOOM_MIN = 4.2, ZOOM_MAX = 10.0;
  let camDist = THREE.MathUtils.clamp(camera.position.distanceTo(target), ZOOM_MIN, ZOOM_MAX);
  const _zoomOff = new THREE.Vector3();
  const zStyle = document.createElement('style');
  zStyle.textContent =
    '.tx-zoom{position:absolute;right:14px;top:50%;transform:translateY(-50%);z-index:12;width:30px;height:170px;display:flex;align-items:center;justify-content:center;}' +
    '.tx-zoom-track{position:relative;width:6px;height:100%;border-radius:999px;background:rgba(0,0,0,0.35);box-shadow:inset 0 1px 3px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.10);cursor:pointer;}' +
    '.tx-zoom-fill{position:absolute;left:0;right:0;top:0;border-radius:999px;background:linear-gradient(180deg,rgba(92,221,198,0.55),rgba(92,221,198,0.12));}' +
    '.tx-zoom-thumb{position:absolute;left:50%;width:18px;height:18px;margin-left:-9px;margin-top:-9px;border-radius:50%;cursor:grab;background-image:radial-gradient(circle at 50% 35%,rgba(255,255,255,0.95),rgba(235,247,244,0.7) 45%,rgba(200,225,221,0.85) 75%);border:1px solid rgba(255,255,255,0.5);box-shadow:0 2px 6px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.85);touch-action:none;}' +
    '.tx-zoom-thumb:active{cursor:grabbing;}';
  document.head.appendChild(zStyle);
  const zoomEl = document.createElement('div');
  zoomEl.className = 'tx-zoom';
  zoomEl.innerHTML = '<div class="tx-zoom-track"><div class="tx-zoom-fill"></div><div class="tx-zoom-thumb"></div></div>';
  app.appendChild(zoomEl);
  const zTrack = zoomEl.querySelector('.tx-zoom-track');
  const zFill = zoomEl.querySelector('.tx-zoom-fill');
  const zThumb = zoomEl.querySelector('.tx-zoom-thumb');
  function zoomRender() {
    const t = (camDist - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);   // 0 = top (in), 1 = bottom (out)
    zThumb.style.top = (t * 100) + '%';
    zFill.style.height = (t * 100) + '%';
  }
  function zoomFromY(clientY) {
    const r = zTrack.getBoundingClientRect();
    let t = (clientY - r.top) / r.height;
    t = Math.min(1, Math.max(0, t));
    camDist = ZOOM_MIN + t * (ZOOM_MAX - ZOOM_MIN);
    zoomRender();
  }
  let zDrag = false;
  zThumb.addEventListener('pointerdown', (e) => { zDrag = true; e.stopPropagation(); });
  zTrack.addEventListener('pointerdown', (e) => { zDrag = true; zoomFromY(e.clientY); e.stopPropagation(); });
  window.addEventListener('pointermove', (e) => { if (zDrag) zoomFromY(e.clientY); });
  window.addEventListener('pointerup', () => { zDrag = false; });
  zoomRender();

  // ---------- simulate ----------
  const tmpForce = new THREE.Vector3();
  const airForce = new THREE.Vector3();
  const windForce = new THREE.Vector3();
  function simulate(time) {
    for (let s = 0; s < SUBSTEPS; s++) {
      for (const p of particles) p.addForce(GRAVITY);
      if (WIND_ON) {
        const w = Math.sin(time / 700) * 6 + 4;
        windForce.set(w, Math.sin(time / 500) * 1.5, Math.cos(time / 600) * 5).multiplyScalar(MASS * WIND_SCALE);
        for (const p of particles) p.addForce(windForce);
      }
      if (Math.abs(spinVel) > 1e-5) {
        for (const p of particles) {
          if (p.pinned) continue;
          airForce.set(-p.position.z, 0, p.position.x).multiplyScalar(AIR_SPIN * spinVel);
          p.addForce(airForce);
        }
      }
      for (const p of particles) p.integrate();
      for (let i = 0; i < CONSTRAINT_ITER; i++)
        for (const c of constraints) satisfy(c[0], c[1], c[2], c[3]);
      for (const p of particles) {
        tmpForce.subVectors(p.position, SPHERE_C);
        const d = tmpForce.length();
        const surf = SPHERE_R + SKIN_OFFSET;
        if (d < surf && d > 1e-6) {
          const n = tmpForce.multiplyScalar(1 / d);
          p.position.copy(SPHERE_C).addScaledVector(n, surf);
          const prev = p.previous.clone().sub(SPHERE_C);
          const pd = prev.length();
          if (pd < surf && pd > 1e-6) p.previous.copy(SPHERE_C).addScaledVector(prev.multiplyScalar(1 / pd), surf);
          p.previous.lerp(p.position, FRICTION);
        }
        if (p.position.y < FLOOR_Y + SKIN_OFFSET) {
          p.position.y = FLOOR_Y + SKIN_OFFSET;
          p.previous.lerp(p.position, FRICTION);
        }
      }
    }
  }

  // ---------- loop (render only when on screen) ----------
  let visible = true;
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0 }).observe(app);

  function animate(t) {
    requestAnimationFrame(animate);
    if (!visible) return;
    spinAngle += spinVel; spinVel *= SPIN_DECAY;
    updatePinSpin(spinAngle);
    sphere.rotation.y = spinAngle;
    simulate(t);
    syncMesh();
    if (AUTO_ROT) {
      const a = AUTO_ROT, px = camera.position.x, pz = camera.position.z;
      camera.position.x = px * Math.cos(a) - pz * Math.sin(a);
      camera.position.z = px * Math.sin(a) + pz * Math.cos(a);
    }
    _zoomOff.copy(camera.position).sub(target).setLength(camDist);   // apply slider zoom
    camera.position.copy(target).add(_zoomOff);
    camera.lookAt(target);
    renderer.render(scene, camera);
  }
  animate(0);
}
