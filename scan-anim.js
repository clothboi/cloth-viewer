// TextylScanAnim v1 - interactive scan-to-garment demo
// host: <div id="tx-scan"></div> sized by the page; assets live in ./scan/
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ASSET = new URL('scan/', import.meta.url).href;
const CSS = "#tx-scan { position:relative; width:100%; height:100%; min-height:480px; overflow:hidden; background:linear-gradient(180deg,#0c272d,#10353C 60%,#14424d); font-family:'Instrument Sans',sans-serif; }\n  #tx-scan #txs-c { width:100%; height:100%; display:block; touch-action:pan-y; position:relative; z-index:1; }\n  #tx-scan #txs-hint { position:absolute; bottom:24px; width:100%; text-align:center; color:#5cddc6; font-size:13px; letter-spacing:.12em; text-transform:uppercase; pointer-events:none; }\n  #tx-scan #txs-head { position:absolute; top:44px; left:50%; transform:translateX(-50%); width:min(680px, 90vw); text-align:left; pointer-events:none; z-index:2; transition:opacity .35s ease, transform .35s ease; }\n  #tx-scan #txs-head.out { opacity:0; transform:translateX(-50%) translateY(10px); }\n  #tx-scan #txs-head .eyebrow { color:#5cddc6; font-size:13px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; margin-bottom:14px; text-shadow:0 1px 4px rgba(0,0,0,0.5); }\n  #tx-scan #txs-head h2 { color:#ecf3f1; font-size:40px; line-height:1.1; font-weight:500; letter-spacing:-0.02em; margin:0 0 12px; text-shadow:0 2px 8px rgba(0,0,0,0.6); }\n  #tx-scan #txs-head .sub { color:#c6d6d3; font-size:17px; font-weight:500; margin:0 0 8px; }\n  #tx-scan #txs-head .meta { color:#98aeac; font-size:13px; font-weight:500; margin:0; }\n  #tx-scan #txs-dock { position:absolute; left:50%; bottom:18px; transform:translate(-50%, 140%); display:flex; align-items:center; gap:96px; padding:12px 120px; border-radius:999px; background:linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03)); border:1px solid rgba(255,255,255,0.14); box-shadow:inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 32px rgba(0,0,0,0.4); backdrop-filter:blur(14px); transition:transform .6s cubic-bezier(.2,.9,.3,1.2); z-index:3; }\n  #tx-scan #txs-dock.up { transform:translate(-50%, 0); }\n  #tx-scan .dockbtn { position:relative; width:54px; height:54px; display:flex; align-items:center; justify-content:center; cursor:pointer; user-select:none; -webkit-user-select:none; touch-action:none; }\n  #tx-scan .dockbtn svg { width:42px; height:42px; }\n  #tx-scan .dockbtn .lbl { position:absolute; bottom:88px; left:50%; transform:translateX(-50%); white-space:nowrap; color:#5cddc6; font-size:12px; font-weight:500; letter-spacing:.1em; text-transform:uppercase; background:rgba(7,20,20,0.75); padding:6px 12px; border-radius:999px; border:1px solid rgba(92,221,198,0.3); opacity:0; transition:opacity .3s; pointer-events:none; }\n  #tx-scan .dockbtn.prompt .lbl { opacity:1; animation:lblflash 1.2s ease-in-out infinite; }\n  #tx-scan .dockbtn.prompt svg { animation:bounce 1.2s ease-in-out infinite; }\n  @keyframes bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-9px); } }\n  @keyframes lblflash { 0%,100% { opacity:1; } 50% { opacity:0.45; } }\n  #tx-scan #txs-suckimg { position:absolute; pointer-events:none; z-index:4; background-size:cover; border-radius:8px; border:1px solid rgba(255,255,255,0.3); transition:all .9s cubic-bezier(.5,0,.8,.4); }\n  #tx-scan #txs-ghostfold { position:absolute; left:0; top:0; pointer-events:none; z-index:5; width:42px; height:42px; display:none; }\n  #tx-scan #txs-blog { position:absolute; top:50%; right:calc(50% + 210px); transform:translateY(-50%); text-align:right; z-index:2; opacity:0; transition:opacity .5s; pointer-events:none; }\n  #tx-scan #txs-blog.show { opacity:1; }\n  #tx-scan #txs-blog .bt { color:#ecf3f1; font-size:20px; font-weight:600; margin-bottom:14px; }\n  #tx-scan #txs-blog .bl { color:#98aeac; font-size:13px; font-weight:500; margin:7px 0; opacity:0; transform:translateX(10px); transition:opacity .4s, transform .4s; }\n  #tx-scan #txs-blog .bl b { color:#c6d6d3; font-weight:600; }\n  #tx-scan #txs-blog .bl.on { opacity:1; transform:none; }\n  #tx-scan #txs-zoom { position:absolute; right:-44px; top:50%; width:180px; transform:translateY(-50%) rotate(-90deg); -webkit-appearance:none; appearance:none; background:transparent; opacity:0; pointer-events:none; transition:opacity .4s; z-index:3; }\n  #tx-scan #txs-zoom.show { opacity:1; pointer-events:auto; }\n  #tx-scan #txs-zoomico { position:absolute; right:36px; top:calc(50% - 124px); width:22px; height:22px; opacity:0; transition:opacity .4s; z-index:3; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5)); }\n  #tx-scan #txs-zoomico.show { opacity:1; }\n  #tx-scan #txs-zoom::-webkit-slider-runnable-track { height:6px; border-radius:999px; background:linear-gradient(to right, rgba(92,221,198,0.75) var(--p,25%), rgba(10,40,46,0.8) var(--p,25%)); box-shadow:inset 0 1px 3px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.08); }\n  #tx-scan #txs-zoom::-webkit-slider-thumb { -webkit-appearance:none; width:20px; height:20px; margin-top:-7px; border-radius:50%; background:radial-gradient(circle at 35% 28%, #ffffff 0%, #e9f7f3 22%, #bce9df 55%, #74c5b5 100%); border:1px solid rgba(60,150,170,0.75); box-shadow:inset 0 -2px 3px rgba(0,55,65,0.45), 0 2px 6px rgba(0,0,0,0.5); cursor:pointer; }\n  #tx-scan #txs-zoom::-moz-range-track { height:6px; border-radius:999px; background:linear-gradient(to right, rgba(92,221,198,0.75) var(--p,25%), rgba(10,40,46,0.8) var(--p,25%)); box-shadow:inset 0 1px 3px rgba(0,0,0,0.65); }\n  #tx-scan #txs-zoom::-moz-range-thumb { width:20px; height:20px; border-radius:50%; background:radial-gradient(circle at 35% 28%, #ffffff 0%, #e9f7f3 22%, #bce9df 55%, #74c5b5 100%); border:1px solid rgba(60,150,170,0.75); box-shadow:inset 0 -2px 3px rgba(0,55,65,0.45), 0 2px 6px rgba(0,0,0,0.5); cursor:pointer; }\n  #tx-scan #txs-swatches { position:absolute; left:50%; bottom:106px; transform:translateX(-50%); display:flex; gap:14px; z-index:3; pointer-events:none; }\n  #tx-scan .sw { width:64px; height:64px; border-radius:12px; background-size:cover; border:1px solid rgba(255,255,255,0.3); box-shadow:0 6px 16px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25); opacity:0; transform:translateY(26px) scale(0.6); transition:opacity .35s ease, transform .45s cubic-bezier(.2,.9,.3,1.3); pointer-events:auto; cursor:grab; touch-action:none; }\n  #tx-scan .sw.in { opacity:1; transform:none; }\n  #tx-scan #txs-ghostsw { position:absolute; left:0; top:0; width:56px; height:56px; border-radius:10px; background-size:cover; pointer-events:none; z-index:5; display:none; border:1px solid rgba(255,255,255,0.45); }\n  #tx-scan #txs-trashbtn.hot svg { filter:drop-shadow(0 0 9px rgba(92,221,198,0.95)); }\n  #tx-scan #txs-ghostcur { position:absolute; left:0; top:0; width:22px; height:22px; border-radius:50%; border:2px solid rgba(236,243,241,0.95); background:rgba(92,221,198,0.35); box-shadow:0 0 12px rgba(92,221,198,0.5); pointer-events:none; z-index:6; opacity:0; transition:opacity .4s; }\n  #tx-scan #txs-swhint { position:absolute; left:50%; bottom:188px; transform:translateX(-50%); white-space:nowrap; color:#5cddc6; font-size:12px; font-weight:500; letter-spacing:.1em; text-transform:uppercase; background:rgba(7,20,20,0.75); padding:6px 14px; border-radius:999px; border:1px solid rgba(92,221,198,0.3); opacity:0; transition:opacity .35s; pointer-events:none; z-index:3; }\n  #tx-scan #txs-swhint.on { opacity:1; animation:lblflash 1.2s ease-in-out infinite; }\n  #tx-scan .sw, #tx-scan #txs-zoom { touch-action:none; }";
const DOM = '<canvas id="txs-c"></canvas>\n<div id="txs-head">\n  <div class="eyebrow">Step 1</div>\n  <h2>Capture fabric.</h2>\n  <p class="sub">Drag the phone over the fabric and line the circles up to scan.</p>\n  <p class="meta">Phone snap, supplier flat-lay, Pinterest find. Any clear photo of fabric works.</p>\n</div>\n<div id="txs-blog">\n  <div class="bt">Building<span id="txs-bdots"> .</span></div>\n  <div class="bl">type — <b>tartan</b></div>\n  <div class="bl">weave — <b>2/2 twill</b></div>\n  <div class="bl">sett — <b>13 bands</b></div>\n  <div class="bl">density — <b>15 × 15 threads/cm</b></div>\n  <div class="bl">swatch — <b>3 cm</b></div>\n  <div class="bl">maps — <b>base · normal · height</b></div>\n</div>\n<div id="txs-dock">\n  <div class="dockbtn" id="txs-mannbtn">\n    <svg viewBox="0 0 48 48"><circle cx="24" cy="9" r="5" fill="#ecf3f1"/><path d="M24 16 L13 22 L15 44 L33 44 L35 22 Z" fill="#ecf3f1"/></svg>\n    <div class="lbl">click to open 3D software</div>\n  </div>\n  <div class="dockbtn" id="txs-foldbtn">\n    <svg viewBox="0 0 48 48"><path d="M4 14 L4 38 Q4 41 7 41 L41 41 Q44 41 44 38 L44 18 Q44 15 41 15 L22 15 L18 10 Q17 9 15 9 L7 9 Q4 9 4 12 Z" fill="#f0d189" stroke="#0d262c" stroke-width="2.5"/></svg>\n    <div class="lbl">click to open</div>\n  </div>\n  <div style="width:1px;height:44px;background:rgba(255,255,255,0.18)"></div>\n  <div class="dockbtn" id="txs-trashbtn">\n    <svg viewBox="0 0 48 48"><path d="M14 16 L34 16 L32 42 Q32 44 30 44 L18 44 Q16 44 16 42 Z" fill="#9aa7a5"/><rect x="11" y="11" width="26" height="4" rx="2" fill="#9aa7a5"/><rect x="20" y="7" width="8" height="5" rx="2" fill="#9aa7a5"/><line x1="20" y1="21" x2="20.7" y2="39" stroke="#5d6a68" stroke-width="2"/><line x1="24" y1="21" x2="24" y2="39" stroke="#5d6a68" stroke-width="2"/><line x1="28" y1="21" x2="27.3" y2="39" stroke="#5d6a68" stroke-width="2"/></svg>\n  </div>\n</div>\n<div id="txs-swatches"></div>\n<div id="txs-swhint">drag a swatch on the garment</div>\n<div id="txs-ghostsw"></div>\n<div id="txs-ghostcur"></div>\n<svg id="txs-zoomico" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="#5cddc6" stroke-width="2"/><line x1="15" y1="15" x2="21" y2="21" stroke="#5cddc6" stroke-width="2.4" stroke-linecap="round"/></svg>\n<input type="range" id="txs-zoom" min="0" max="100" value="25">\n<div id="txs-ghostfold"><svg viewBox="0 0 48 48"><path d="M4 14 L4 38 Q4 41 7 41 L41 41 Q44 41 44 38 L44 18 Q44 15 41 15 L22 15 L18 10 Q17 9 15 9 L7 9 Q4 9 4 12 Z" fill="#f0d189" stroke="#0d262c" stroke-width="2.5"/></svg></div>';

function boot() {
  const host = document.getElementById('tx-scan');
  if (!host || host.dataset.txScan) return;
  host.dataset.txScan = '1';
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  host.innerHTML = DOM;
  let VW = host.clientWidth || 800, VH = host.clientHeight || 600;
  let inView = true;
  const HR = () => host.getBoundingClientRect();
  const EX = (e) => e.clientX - HR().left;
  const EY = (e) => e.clientY - HR().top;



const TARTAN = ASSET + 'scan-tartan.webp';

const SWATCHES = [
  { name: 'tartan', data: ASSET + 'sw-tartan.jpg', normal: ASSET + 'sw-tartan-n.webp' },
  { name: 'houndstooth', data: ASSET + 'sw-houndstooth.jpg', normal: ASSET + 'sw-houndstooth-n.webp' },
  { name: 'linen', data: ASSET + 'sw-linen.jpg', normal: ASSET + 'sw-linen-n.webp' },
  { name: 'gingham', data: ASSET + 'sw-gingham.jpg', normal: ASSET + 'sw-gingham-n.webp' },
  { name: 'madras', data: ASSET + 'sw-madras.jpg', normal: ASSET + 'sw-madras-n.webp' },
  { name: 'denim', data: ASSET + 'sw-denim.jpg', normal: ASSET + 'sw-denim-n.webp' }
];

const head = document.getElementById('txs-head');
const STEPS = {
  3: {
    eyebrow: 'Step 3',
    h: 'Drop it on a garment.',
    sub: 'Drag the folder onto the garment to dress it in your new fabric.',
    meta: 'Compare candidates side by side. Lock direction before a metre is cut.'
  },
  2: {
    eyebrow: 'Step 2',
    h: 'Generate the digital replica.',
    sub: 'Textyl analyses the structure and calculates the parameters to reconstruct digitally.',
    meta: 'Tileable base colour, normal and height maps. Seconds, not scanners.'
  }
};
function setStep(n) {
  const s = STEPS[n];
  head.classList.add('out');
  setTimeout(() => {
    head.querySelector('.eyebrow').textContent = s.eyebrow;
    head.querySelector('h2').textContent = s.h;
    head.querySelector('.sub').textContent = s.sub;
    head.querySelector('.meta').textContent = s.meta;
    head.classList.remove('out');
  }, 380);
}

const canvas = document.getElementById('txs-c');
const hint = { textContent: '' };   // bottom hint removed: header carries the copy
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));   // before setSize, always
renderer.setSize(VW, VH);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, VW/VH, 0.1, 50);
camera.position.set(0, 8.5, 5.8);
camera.lookAt(0, 0, -0.2);

const amb = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(amb);

// soft radial floor: mid grey melting to nothing
const floorTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(128,128,10, 128,128,128);
  grad.addColorStop(0, 'rgba(40,46,50,0.9)');
  grad.addColorStop(0.45, 'rgba(26,31,34,0.6)');
  grad.addColorStop(1, 'rgba(18,22,25,0)');
  g.fillStyle = grad; g.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(cv);
})();
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(15, 15),
  new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false })
);
floor.rotation.x = -Math.PI/2;
floor.position.y = -0.012;
floor.renderOrder = -1;
scene.add(floor);
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(-3, 6, 2);
scene.add(sun);

// garment-stage three-point rig: lives dark until the 3D software "opens"
const rig = new THREE.Group();
function mkLight(colour, intensity, x, y, z) {
  const L = new THREE.DirectionalLight(colour, intensity);
  L.position.set(x, y, z);
  L.target.position.set(0, 2, 0);
  rig.add(L, L.target);
  return L;
}
mkLight(0xfff1e0, 1.5, -3.5, 4.5, 4.0);   // key: warm, high front-left
mkLight(0xdce9ff, 0.5,  3.0, 2.5, 4.0);   // fill: cool, low front-right
mkLight(0xffffff, 0.8,  0.5, 3.2, -5.5);  // rim: shoulder height behind, edge kiss not floodlight
rig.visible = false;
scene.add(rig);

// fabric: flat photo plane (placeholder for the hero render)
const tex = new THREE.TextureLoader().load(TARTAN);
tex.colorSpace = THREE.SRGBColorSpace;
tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
const fabric = new THREE.Mesh(
  new THREE.PlaneGeometry(4, 4),
  new THREE.MeshBasicMaterial({ map: tex, transparent: true })
);
fabric.rotation.x = -Math.PI/2;
scene.add(fabric);

// scan frame: four corner brackets that expand across the fabric on scan
const cornerMat = new THREE.MeshBasicMaterial({ color: 0x5cddc6, transparent: true, opacity: 0.85 });
const corners = new THREE.Group();
const CL = 0.22, CT = 0.035;   // bracket arm length / thickness
for (let i = 0; i < 4; i++) {
  const sx = (i % 2) ? 1 : -1, sz = (i < 2) ? -1 : 1;
  const g = new THREE.Group();
  const a1 = new THREE.Mesh(new THREE.PlaneGeometry(CL, CT), cornerMat);
  a1.position.x = CL / 2;
  const a2 = new THREE.Mesh(new THREE.PlaneGeometry(CT, CL), cornerMat);
  a2.position.y = -CL / 2;
  g.add(a1, a2);
  g.scale.set(-sx, -sz, 1);   // mirror the canonical bracket into each corner
  g.rotation.x = -Math.PI/2;
  g.position.y = 0.012;
  g.userData = { sx, sz };
  corners.add(g);
}
scene.add(corners);
// static aim circle at the centre
const aim = new THREE.Mesh(
  new THREE.RingGeometry(0.10, 0.13, 40),
  new THREE.MeshBasicMaterial({ color: 0x5cddc6, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
);
aim.rotation.x = -Math.PI/2;
aim.position.y = 0.012;
scene.add(aim);

// radial cyan wash: clear centre, glowing band, feathered to nothing at the square bounds
const washTex = (() => {
  const N = 256;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d');
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = Math.abs(x - N/2) / (N/2), dy = Math.abs(y - N/2) / (N/2);
      const dcheb = Math.max(dx, dy);                       // square distance: fills the corners
      let a = Math.min(1, Math.max(0, (dcheb - 0.22) / 0.35)) * 0.30;  // clear centre, builds outward
      a *= Math.min(1, Math.max(0, (1 - dcheb) / 0.07));    // slight feather right at the bounds
      a *= (y % 4 < 2 ? 1 : 0.6);                           // scanlines
      a *= 0.9 + Math.random() * 0.2;                       // grain
      const i = (y * N + x) * 4;
      img.data[i] = 92; img.data[i+1] = 221; img.data[i+2] = 198;
      img.data[i+3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(cv);
})();
const wash = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.MeshBasicMaterial({ map: washTex, transparent: true, opacity: 0, depthWrite: false })
);
wash.rotation.x = -Math.PI/2;
wash.position.y = 0.011;
scene.add(wash);

let frameSize = 0.7;          // half-width of the bracket square
function layoutCorners(s) {
  corners.children.forEach((g) => {
    g.position.x = g.userData.sx * s;
    g.position.z = g.userData.sz * s;
  });
  wash.scale.set(s, s, 1);
}
layoutCorners(frameSize);

// phone: Joshua's bevelled glb; the 'glass' material becomes the live screen
const phone = new THREE.Group();

// "drag me" lives on the phone screen until first grab: white on black, inverting flash
const dragCv = document.createElement('canvas');
dragCv.width = 288; dragCv.height = 576;
const dgx = dragCv.getContext('2d');
const dragTex = new THREE.CanvasTexture(dragCv);
dragTex.colorSpace = THREE.SRGBColorSpace;
dragTex.flipY = false;                    // glb UV convention: v=0 at the top
function drawDragMe(inv) {
  dgx.fillStyle = inv ? '#ffffff' : '#000000';
  dgx.fillRect(0, 0, 288, 576);
  dgx.fillStyle = inv ? '#000000' : '#ffffff';
  dgx.font = '600 34px "Instrument Sans", sans-serif';
  dgx.textAlign = 'center'; dgx.textBaseline = 'middle';
  dgx.fillText('drag me', 144, 288);
  dragTex.needsUpdate = true;
}

const rt = new THREE.WebGLRenderTarget(288, 576);
rt.texture.wrapT = THREE.RepeatWrapping;  // flip vertically for the glb UVs
rt.texture.repeat.y = -1;
rt.texture.offset.y = 1;
const rtCam = new THREE.PerspectiveCamera(72, 0.78 / 1.55, 0.05, 10);
rtCam.rotation.x = -Math.PI/2;

// screen reticle: centre the fabric's circle inside this (sampled in-shader now)
const retTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.strokeStyle = 'rgba(236,243,241,0.9)'; g.lineWidth = 6;
  const L = 40, M = 28;
  [[M,M,1,1],[256-M,M,-1,1],[M,256-M,1,-1],[256-M,256-M,-1,-1]].forEach(([x,y,sx,sy]) => {
    g.beginPath(); g.moveTo(x + L*sx, y); g.lineTo(x, y); g.lineTo(x, y + L*sy); g.stroke();
  });
  g.beginPath(); g.arc(128,128,52,0,Math.PI*2); g.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.flipY = false;
  return t;
})();

// one material runs the whole phone OS: content map + reticle + scan-glow composited in-shader
const scrState = { fill: 0 };
let scrU = null;
const screenMat = new THREE.MeshBasicMaterial({ map: dragTex });
screenMat.customProgramCacheKey = () => 'phonescreen';
screenMat.onBeforeCompile = (shader) => {
  shader.uniforms.uRetTex = { value: retTex };
  shader.uniforms.uRetOn = { value: 0 };
  shader.uniforms.uFill = { value: 0 };
  scrU = shader.uniforms;
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform sampler2D uRetTex;\nuniform float uRetOn;\nuniform float uFill;')
    .replace('#include <map_fragment>', `#include <map_fragment>
{
  vec2 suv = vMapUv;
  vec2 ruv = (suv - 0.5) * vec2(1.0 / 0.705, 1.0 / 0.355) + 0.5;
  vec4 ret = (ruv.x > 0.0 && ruv.x < 1.0 && ruv.y > 0.0 && ruv.y < 1.0) ? texture2D(uRetTex, ruv) : vec4(0.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, ret.rgb, ret.a * uRetOn);
  float fillOn = step(1.0 - uFill, suv.y);
  float ln = mod(floor(suv.y * 144.0), 2.0) < 1.0 ? 1.0 : 0.55;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.866, 0.776) * (0.7 + 0.3 * ln), fillOn * 0.34 * ln);
}`);
};

// proxies keep the rest of the flow untouched
const screen = { material: screenMat };
const reticle = { visible: false };
const glow = { set visible(v) { if (!v) scrState.fill = 0; } };
function setGlowFill(s) { scrState.fill = s; }
setGlowFill(0);

parseGlb(ASSET + 'phone.glb').then((g) => {
  const pr = g.scene;
  const pbox = new THREE.Box3().setFromObject(pr);
  const psize = pbox.getSize(new THREE.Vector3());
  pr.scale.setScalar(1.8 / Math.max(psize.x, psize.y, psize.z));
  pbox.setFromObject(pr);
  const pc = pbox.getCenter(new THREE.Vector3());
  pr.position.sub(pc);
  pr.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.name !== 'glass') return;
    o.material = screenMat;
    // rebuild the screen UVs by flat projection so the canvas fills the glass exactly
    const pos = o.geometry.attributes.position;
    const bb2 = new THREE.Box3().setFromBufferAttribute(pos);
    const sw = bb2.max.x - bb2.min.x, sl = bb2.max.z - bb2.min.z;
    const uvArr = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uvArr[i*2] = (pos.getX(i) - bb2.min.x) / sw;
      uvArr[i*2+1] = (pos.getZ(i) - bb2.min.z) / sl;
    }
    o.geometry.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    rtCam.aspect = sw / sl;             // true screen proportions for the magnifier
    rtCam.updateProjectionMatrix();
  });
  phone.add(pr);
}).catch((err) => console.error('phone glb failed', err));

let everDragged = false, lastInteract = performance.now();

// phone-screen matrix rain (vertical only, dense)
const rainCv = document.createElement('canvas');
rainCv.width = 288; rainCv.height = 576;
const rx = rainCv.getContext('2d');
const rainTex = new THREE.CanvasTexture(rainCv);
rainTex.colorSpace = THREE.SRGBColorSpace;
rainTex.flipY = false;
const RFS = 20;
const RCOLS = Math.ceil(288 / RFS), RROWS = Math.ceil(576 / RFS);
const RTRAIL = Math.round(RROWS * 0.85), RGLEN = RROWS + RTRAIL + 4;
const rgrid = [], rdrops = [], rsp = [];
for (let i = 0; i < RCOLS; i++) {
  rgrid[i] = [];
  for (let k2 = 0; k2 < RGLEN; k2++) rgrid[i][k2] = Math.random() < 0.5 ? '0' : '1';
  rdrops[i] = []; rsp[i] = [];
  for (let dd = 0; dd < 3; dd++) {
    rdrops[i][dd] = Math.random() * (RROWS + RTRAIL) - RTRAIL * 0.3;
    rsp[i][dd] = 0.12 + Math.random() * 0.22;
  }
}
// analysing screen: teal panel with cycling dots
const analyseCv = document.createElement('canvas');
analyseCv.width = 288; analyseCv.height = 576;
const ax = analyseCv.getContext('2d');
const analyseTex = new THREE.CanvasTexture(analyseCv);
analyseTex.colorSpace = THREE.SRGBColorSpace;
analyseTex.flipY = false;
function drawAnalyse() {
  const g = ax.createLinearGradient(0, 0, 0, 576);
  g.addColorStop(0, '#1a525e');
  g.addColorStop(1, '#0e3842');
  ax.fillStyle = g;
  ax.fillRect(0, 0, 288, 576);
  const dots = '. '.repeat(1 + Math.floor(performance.now() / 380) % 3).trim();
  ax.fillStyle = '#5cddc6';
  ax.font = '500 30px "Instrument Sans", sans-serif';
  ax.textAlign = 'center';
  ax.fillText('analysing ' + dots, 144, 300);
  analyseTex.needsUpdate = true;
}

const rainImg = new Image();
rainImg.crossOrigin = 'anonymous';
rainImg.src = SWATCHES[0].data;   // the clean tileable output, same as the shirt swatch
const rfill = new Array(RCOLS).fill(0);          // revealed rows per column, from the bottom
const rdrain = [];
for (let i = 0; i < RCOLS; i++) rdrain.push(0.3 + Math.random() * 0.45);
let rainDone = false;
function drawRain(dtF) {
  rx.fillStyle = '#0a2227';
  rx.fillRect(0, 0, 288, 576);
  rx.font = 'bold ' + RFS + 'px ui-monospace,"Courier New",monospace';
  rx.textBaseline = 'top';
  // texture revealed from the bottom, tetris-stack style
  const IMW = rainImg.naturalWidth || 512, IMH = rainImg.naturalHeight || 512;
  const SRCW = IMW / 2, SRCX = IMW / 4;          // cover-crop of the source
  for (let i = 0; i < RCOLS; i++) {
    if (rfill[i] <= 0) continue;
    const hPx = Math.min(rfill[i], RROWS) * RFS;
    const yTop = 576 - hPx;
    const sx = SRCX + (i * RFS) / 288 * SRCW;
    const sw = RFS / 288 * SRCW;
    const sy = yTop / 576 * IMH;
    const sh = hPx / 576 * IMH;
    rx.globalAlpha = 1;
    rx.drawImage(rainImg, sx, sy, sw, sh, i * RFS, yTop, RFS, hPx);
  }
  // rain falls onto the stack; each landing reveals more texture
  let full = 0;
  for (let i = 0; i < RCOLS; i++) {
    const xp = i * RFS;
    const surface = RROWS - rfill[i];            // row the stack has reached
    if (rfill[i] >= RROWS) { full++; continue; }
    for (let dd = 0; dd < 3; dd++) {
      const hy = rdrops[i][dd];
      for (let k2 = 0; k2 < RTRAIL; k2++) {
        const row = Math.floor(hy) - k2;
        if (row < 0 || row >= surface) continue;
        const ch = rgrid[i][((row % RGLEN) + RGLEN) % RGLEN];
        const a = k2 === 0 ? 0.85 : Math.pow(1 - k2 / RTRAIL, 1.4) * 0.6;
        rx.globalAlpha = a;
        rx.fillStyle = k2 === 0 ? '#bff3e8' : '#5cddc6';
        rx.fillText(ch, xp, row * RFS);
      }
      rdrops[i][dd] += rsp[i][dd] * dtF * 1.5;
      if (Math.floor(rdrops[i][dd]) >= surface) {
        rfill[i] = Math.min(RROWS, rfill[i] + 3);          // the landing builds the stack
        rdrops[i][dd] = -Math.random() * RTRAIL * 0.4;
        rsp[i][dd] = 0.12 + Math.random() * 0.22;
        rx.globalAlpha = 0.9;                              // landing flash
        rx.fillStyle = '#bff3e8';
        rx.fillRect(xp, (surface - 1) * RFS + RFS * 0.7, RFS - 2, 3);
      }
    }
  }
  if (full === RCOLS && !rainDone) {
    rainDone = true;
    hint.textContent = 'replica complete. (normal/height maps + log next)';
  }
  // analyse screen lingers, fading out under the first second of rain
  if (rainFade < 1) {
    rainFade = Math.min(1, rainFade + dtF / 55);
    rx.globalAlpha = (1 - rainFade) * 0.95;
    rx.drawImage(analyseCv, 0, 0);
  }
  rx.globalAlpha = 1;
  rainTex.needsUpdate = true;
}

// ---------- dock / suck / garment machinery ----------
const dock = document.getElementById('txs-dock');
const foldbtn = document.getElementById('txs-foldbtn');
const mannbtn = document.getElementById('txs-mannbtn');
const ghostfold = document.getElementById('txs-ghostfold');
let dockPhase = 0;        // 0 none, 1 dock up + draining, 2 mannequin prompt, 3 garment in / folder prompt, 4 dressed
let blogT = 0;
const blog = document.getElementById('txs-blog');
const bdots = document.getElementById('txs-bdots');
const blogLines = Array.from(document.querySelectorAll('#txs-blog .bl'));
let drainT = 0;

// fabric palette for the pixel stream, sampled from the tartan
const palette = [];
rainImg.addEventListener('load', () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  g.drawImage(rainImg, 0, 0, 64, 64);
  const data = g.getImageData(0, 0, 64, 64).data;
  for (let i = 0; i < 40; i++) {
    const o = Math.floor(Math.random() * 4096) * 4;
    palette.push('rgb(' + data[o] + ',' + data[o+1] + ',' + data[o+2] + ')');
  }
});

function projectToPx(v3) {
  const v = v3.clone().project(camera);
  return [(v.x * 0.5 + 0.5) * VW, (-v.y * 0.5 + 0.5) * VH];
}

// pixel stream: 3D sprites so they pass BEHIND the phone on their way to the folder
const motes = [];
function dockWorldPoint() {
  const fr = foldbtn.getBoundingClientRect(), hr = HR();
  const px = fr.left - hr.left + fr.width / 2, py = fr.top - hr.top + fr.height / 2;
  const ndc = new THREE.Vector3((px / VW) * 2 - 1, -(py / VH) * 2 + 1, 0.5);
  ndc.unproject(camera);
  const dir = ndc.sub(camera.position).normalize();
  const dist = camera.position.distanceTo(phoneTarget) + 1.6;
  return camera.position.clone().add(dir.multiplyScalar(dist));
}
function spawnMote() {
  if (!palette.length) return;
  const mat = new THREE.SpriteMaterial({ color: new THREE.Color(palette[Math.floor(Math.random()*palette.length)]), transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  const s = 0.05 + Math.random() * 0.07;
  sp.scale.set(s, s, 1);
  const behind = phoneTarget.clone().sub(camera.position).normalize().multiplyScalar(0.7);
  const start = phone.position.clone().add(new THREE.Vector3((Math.random()-0.5)*0.6, -0.85, 0)).add(behind);
  const end = dockWorldPoint();
  const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3((Math.random()-0.5)*0.9, -0.2, 0));
  sp.position.copy(start);
  scene.add(sp);
  motes.push({ sp, t: 0, start, mid, end, dur: 0.5 + Math.random() * 0.35 });
}
const _mv1 = new THREE.Vector3(), _mv2 = new THREE.Vector3();
function tickMotes(dt) {
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.t += dt / m.dur;
    if (m.t >= 1) {
      scene.remove(m.sp); m.sp.material.dispose();
      motes.splice(i, 1); continue;
    }
    const t = m.t, mt = 1 - t;
    _mv1.copy(m.start).multiplyScalar(mt * mt);
    _mv2.copy(m.mid).multiplyScalar(2 * mt * t);
    _mv1.add(_mv2).add(_mv2.copy(m.end).multiplyScalar(t * t));
    m.sp.position.copy(_mv1);
    m.sp.material.opacity = 1 - t * t;
  }
}

// drain: the built texture sucks down the screen
function drawDrain(dtF) {
  rx.fillStyle = '#0a2227';
  rx.fillRect(0, 0, 288, 576);
  const IMW = rainImg.naturalWidth || 512, IMH = rainImg.naturalHeight || 512;
  const SRCW = IMW / 2, SRCX = IMW / 4;
  let left = 0;
  for (let i = 0; i < RCOLS; i++) {
    if (rfill[i] > 0) {
      rfill[i] = Math.max(0, rfill[i] - rdrain[i] * dtF);
      left++;
      const hPx = Math.min(rfill[i], RROWS) * RFS;
      const yTop = 576 - hPx;
      const sx = SRCX + (i * RFS) / 288 * SRCW;
      const sw = RFS / 288 * SRCW;
      rx.drawImage(rainImg, sx, yTop / 576 * IMH, sw, hPx / 576 * IMH, i * RFS, yTop, RFS, hPx);
    }
  }
  rainTex.needsUpdate = true;
  return left === 0;
}

// real shirt + mannequin model (Joshua's export), swatches target the FABRIC material
const garment = new THREE.Group();
let torsoMat = new THREE.MeshStandardMaterial({ color: 0xb9c4c2, roughness: 0.8 });
const _gl = new GLTFLoader();
function parseGlb(url) { return _gl.loadAsync(url); }
Promise.all([parseGlb(ASSET + 'shirt.glb'), parseGlb(ASSET + 'mannequin.glb')]).then(([shirtG, mannG]) => {
  const root = new THREE.Group();
  root.add(mannG.scene, shirtG.scene);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  root.scale.setScalar(3.9 / size.y);
  box.setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  root.position.x -= c.x;
  root.position.z -= c.z;
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);

  // mannequin surface points for the proximity field
  const bodyPts = [];
  const _bv = new THREE.Vector3();
  mannG.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.material.roughness = 0.62;            // matte studio mannequin, not wet plastic
    if ('specularIntensity' in o.material) o.material.specularIntensity = 0.35;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 3) {
      _bv.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      bodyPts.push(_bv.x, _bv.y, _bv.z);
    }
  });
  const shirtMeshes = [];
  shirtG.scene.traverse((o) => { if (o.isMesh) shirtMeshes.push(o); });
  const fabricMesh = shirtMeshes.find((o) => (o.material.name || '').includes('FABRIC')) || shirtMeshes[0];
  if (fabricMesh) {
    torsoMat = fabricMesh.material;
    torsoMat.roughness = 0.85;
    const CELL = 0.12;
    const grid = new Map();
    const gkey = (x, y, z) => x + ',' + y + ',' + z;
    for (let i = 0; i < bodyPts.length; i += 3) {
      const k = gkey(Math.floor(bodyPts[i]/CELL), Math.floor(bodyPts[i+1]/CELL), Math.floor(bodyPts[i+2]/CELL));
      let arr = grid.get(k); if (!arr) { arr = []; grid.set(k, arr); }
      arr.push(i);
    }
    fabricMesh.geometry.computeBoundingBox();
    const bb = fabricMesh.geometry.boundingBox;
    for (const mesh of shirtMeshes) {
    const sPos = mesh.geometry.attributes.position;
    const free = new Float32Array(sPos.count);
    for (let i = 0; i < sPos.count; i++) {
      _bv.fromBufferAttribute(sPos, i).applyMatrix4(mesh.matrixWorld);
      const cx = Math.floor(_bv.x/CELL), cy = Math.floor(_bv.y/CELL), cz = Math.floor(_bv.z/CELL);
      let dmin = 1e9;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (let oz = -1; oz <= 1; oz++) {
        const arr = grid.get(gkey(cx+ox, cy+oy, cz+oz));
        if (!arr) continue;
        for (const j of arr) {
          const dx = _bv.x - bodyPts[j], dy = _bv.y - bodyPts[j+1], dz = _bv.z - bodyPts[j+2];
          const dd = dx*dx + dy*dy + dz*dz;
          if (dd < dmin) dmin = dd;
        }
      }
      free[i] = THREE.MathUtils.clamp((Math.sqrt(dmin) - 0.05) / 0.2, 0, 1);
    }
    mesh.geometry.setAttribute('aFree', new THREE.BufferAttribute(free, 1));

    const mat = mesh.material;
    if (mat !== torsoMat) mat.roughness = 0.45;   // buttons: subtle sheen, not glass
    if ('specularIntensity' in mat) mat.specularIntensity = 0.2;
    mat.customProgramCacheKey = () => 'fabricwind';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uSpin = { value: 0 };
      shader.uniforms.uMinY = { value: bb.min.y };
      shader.uniforms.uMaxY = { value: bb.max.y };
      windUs.push(shader.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uSpin;\nuniform float uMinY;\nuniform float uMaxY;\nattribute float aFree;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float w = 1.0 - smoothstep(uMinY, uMaxY, position.y);
  w = w * w * aFree;
  vec2 tangent = vec2(-position.z, position.x);
  transformed.xz += tangent * (-uSpin) * 0.0675 * w;
  float breeze = sin(uTime * 1.9 + position.y * 2.6 + position.x * 1.8) * 0.6
               + sin(uTime * 3.1 + position.z * 3.4) * 0.4;
  transformed.x += breeze * 0.035 * w;
  transformed.z += cos(uTime * 2.4 + position.x * 2.2) * 0.022 * w;
}`);
    };
    mat.needsUpdate = true;
    }
  }
  garment.add(root);
}).catch((err) => console.error('glb parse failed', err));
// turntable dial: tick ring with curved "spin me" outside it
const dialTex = (() => {
  const N = 1024;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d');
  g.strokeStyle = 'rgba(236,243,241,0.55)';
  g.lineWidth = 5;
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const r1 = N * 0.38, r0 = r1 - (i % 8 === 0 ? 44 : 26);
    g.beginPath();
    g.moveTo(N/2 + Math.cos(a) * r0, N/2 + Math.sin(a) * r0);
    g.lineTo(N/2 + Math.cos(a) * r1, N/2 + Math.sin(a) * r1);
    g.stroke();
  }
  // flat label just outside the ring, front side
  g.fillStyle = '#5cddc6';
  g.font = '600 40px "Instrument Sans", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('spin me', N / 2, N / 2 + N * 0.45);
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 8;
  return t;
})();
const dial = new THREE.Mesh(
  new THREE.PlaneGeometry(3.7, 3.7),
  new THREE.MeshBasicMaterial({ map: dialTex, transparent: true, depthWrite: false, opacity: 0.85 })
);
dial.rotation.x = -Math.PI/2;
dial.position.y = 0.02;
garment.add(dial);
garment.scale.set(0.001, 0.001, 0.001);
garment.visible = false;
scene.add(garment);
let garmentT = -1;
// straight-on front view for the garment stage
let viewMode = 0, camBlend = 0;
const scanCamPos = camera.position.clone();
const scanLook = new THREE.Vector3(0, 0, -0.2);
const frontLook = new THREE.Vector3(0, 2.05, 0);
const frontDir = new THREE.Vector3(0, 0.08, 1).normalize();
const zoomEl = document.getElementById('txs-zoom');
function syncZoom() { zoomEl.style.setProperty('--p', zoomEl.value + '%'); }
zoomEl.addEventListener('input', syncZoom);
syncZoom();
function frontDist() { return 9 - (zoomEl.value / 100) * 5.5; }   // slider: 3.5 close .. 9 far
let dialDragging = false, dialLastAng = 0;
const windUs = []; let lastRotY = 0, spinVel = 0;
// dial interactions happen on a plane at the dial's current height
const dialPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function pointerToDial(e) {
  pointer.x = (EX(e) / VW) * 2 - 1;
  pointer.y = -(EY(e) / VH) * 2 + 1;
  ray.setFromCamera(pointer, camera);
  dialPlane.constant = -dial.position.y;
  const hit = new THREE.Vector3();
  return ray.ray.intersectPlane(dialPlane, hit) ? hit : null;
}
function groundAngle(e) {
  const hit = pointerToDial(e);
  return hit ? Math.atan2(hit.z, hit.x) : null;
}

mannbtn.addEventListener('click', () => {
  if (dockPhase !== 2) return;
  dockPhase = 3;
  mannbtn.classList.remove('prompt');
  garment.visible = true;
  rig.visible = true;
  sun.visible = false;        // hand the stage to the three-point rig
  amb.intensity = 0.3;
  garmentT = 0;
  viewMode = 1;
  zoomEl.classList.add('show');
  document.getElementById('txs-zoomico').classList.add('show');
  setStep(3);
  hint.textContent = 'drag the folder onto the garment';
  setTimeout(() => foldbtn.classList.add('prompt'), 900);
});

// folder click opens the swatch tray; swatches drag onto the garment (or the bin)
function overGarment(e) {
  const [gx, gy] = projectToPx(new THREE.Vector3(0, 2.0, 0));
  return Math.hypot(EX(e) - gx, EY(e) - gy) < Math.min(VW, VH) * 0.2;
}
function overTrash(e) {
  const r = trashbtn.getBoundingClientRect(), hr = HR();
  return EX(e) > r.left - hr.left - 20 && EX(e) < r.right - hr.left + 20 && EY(e) > r.top - hr.top - 20 && EY(e) < r.bottom - hr.top + 20;
}
const trashbtn = document.getElementById('txs-trashbtn');
const swatchesEl = document.getElementById('txs-swatches');
const ghostsw = document.getElementById('txs-ghostsw');
const texCache = {};
function applySwatch(spec) {
  const set = (pair) => {
    const t = pair.t;
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 5);
    torsoMat.map = t;
    if (pair.n) {
      pair.n.wrapS = pair.n.wrapT = THREE.RepeatWrapping;
      pair.n.repeat.set(5, 5);
      torsoMat.normalMap = pair.n;
      torsoMat.normalScale.set(1, 1);
    } else {
      torsoMat.normalMap = null;
    }
    torsoMat.color.set(0xffffff);
    torsoMat.needsUpdate = true;
  };
  if (texCache[spec.name]) { set(texCache[spec.name]); return; }
  const loader = new THREE.TextureLoader();
  loader.load(spec.data, (t) => {
    if (!spec.normal) { texCache[spec.name] = { t }; set(texCache[spec.name]); return; }
    loader.load(spec.normal, (n) => { texCache[spec.name] = { t, n }; set(texCache[spec.name]); });
  });
}
let swDrag = null;
function wireSwatch(el, spec) {
  el.addEventListener('pointerdown', (e) => {
    swDrag = { el, spec };
    ghostsw.style.backgroundImage = 'url(' + spec.data + ')';
    ghostsw.style.display = 'block';
    ghostsw.style.transform = 'translate(' + (EX(e) - 28) + 'px,' + (EY(e) - 28) + 'px)';
    e.preventDefault();
  });
}
addEventListener('pointermove', (e) => {
  if (!swDrag) return;
  ghostsw.style.transform = 'translate(' + (EX(e) - 28) + 'px,' + (EY(e) - 28) + 'px)';
  const okG = overGarment(e), okT = overTrash(e);
  torsoMat.emissive.set(okG ? 0x2a6e63 : 0x000000);
  torsoMat.needsUpdate = true;
  ghostsw.style.filter = (okG || okT) ? 'drop-shadow(0 0 10px rgba(92,221,198,0.9))' : 'none';
  trashbtn.classList.toggle('hot', okT);
});
addEventListener('pointerup', (e) => {
  if (!swDrag) return;
  ghostsw.style.display = 'none';
  ghostsw.style.filter = 'none';
  torsoMat.emissive.set(0x000000);
  trashbtn.classList.remove('hot');
  if (overGarment(e)) {
    applySwatch(swDrag.spec);
    document.getElementById('txs-swhint').classList.remove('on');
  } else if (overTrash(e)) {
    const el = swDrag.el;
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px) scale(0.2)';
    setTimeout(() => el.remove(), 320);
    trashbtn.firstElementChild.style.animation = 'bounce .5s';
    setTimeout(() => trashbtn.firstElementChild.style.animation = '', 520);
  }
  swDrag = null;
});
foldbtn.addEventListener('click', () => {
  if (dockPhase !== 3) return;
  dockPhase = 4;
  foldbtn.classList.remove('prompt');
  SWATCHES.forEach((spec, i) => {
    const el = document.createElement('div');
    el.className = 'sw';
    el.style.backgroundImage = 'url(' + spec.data + ')';
    swatchesEl.appendChild(el);
    wireSwatch(el, spec);
    setTimeout(() => el.classList.add('in'), 90 * i);
  });
  setTimeout(() => document.getElementById('txs-swhint').classList.add('on'), 600);
});

// fake soft shadow
const shadowTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(64,64,8, 64,64,64);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(cv);
})();
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(1.6, 2.4),
  new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
);
shadow.rotation.x = -Math.PI/2;
shadow.position.y = 0.005;
scene.add(shadow);

phone.position.set(2.4, 0.6, 1.4);
scene.add(phone);

// ---- drag with weight + tilt ----
const ray = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const pointer = new THREE.Vector2();
let dragging = false;
const target = phone.position.clone();
const vel = new THREE.Vector3();

function pointerToGround(e) {
  pointer.x = (EX(e) / VW) * 2 - 1;
  pointer.y = -(EY(e) / VH) * 2 + 1;
  ray.setFromCamera(pointer, camera);
  const hit = new THREE.Vector3();
  ray.ray.intersectPlane(groundPlane, hit);
  return hit;
}
canvas.addEventListener('pointerdown', (e) => {
  if (scanned) {
    if (viewMode === 1) {
      const hit = pointerToDial(e);
      if (hit) {
        const r = Math.hypot(hit.x, hit.z);
        if (r > 0.55 && r < 2.1) {
          dialDragging = true;
          dialLastAng = Math.atan2(hit.z, hit.x);
          canvas.setPointerCapture(e.pointerId);
        }
      }
    }
    return;
  }
  lastInteract = performance.now();
  const hit = pointerToGround(e);
  if (hit && hit.distanceTo(phone.position.clone().setY(0)) < 1.4) {
    dragging = true;
    if (!everDragged) {
      everDragged = true;
      screen.material.map = rt.texture;
      screen.material.needsUpdate = true;
      reticle.visible = true;
    }
    canvas.setPointerCapture(e.pointerId);
  }
}, { passive: false });
canvas.addEventListener('pointermove', (e) => {
  if (dialDragging) {
    const a = groundAngle(e);
    if (a !== null) {
      let delta = a - dialLastAng;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      garment.rotation.y -= delta;
      dialLastAng = a;
    }
    return;
  }
  if (!dragging) return;
  e.preventDefault();
  const hit = pointerToGround(e);
  if (hit) { target.x = THREE.MathUtils.clamp(hit.x, -5, 5); target.z = THREE.MathUtils.clamp(hit.z, -3.5, 3.5); }
}, { passive: false });
addEventListener('pointerup', () => { dragging = false; dialDragging = false; });

// ---- scan state (placeholder logic for this test) ----
let scanT = 0, scanned = false, phase = 0, presentT = 0, analyseT = 0, rainFade = 0;
const phoneStart = new THREE.Vector3(), qStart = new THREE.Quaternion();
const phoneTarget = new THREE.Vector3(0, 4.3, 2.6);
const qTarget = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(0, 1, 0),
  camera.position.clone().sub(phoneTarget).normalize()
);

// idle auto-play: a ghost cursor performs the whole flow for non-interactors
const ghostcur = document.getElementById('txs-ghostcur');
const auto = { on: false, done: false, step: '', x: 0, y: 0, tx: 0, ty: 0, wait: 0 };
function startAuto() {
  auto.on = true;
  auto.x = VW * 0.68; auto.y = VH * 0.35;
  auto.step = 'toPhone';
  ghostcur.style.opacity = '1';
}
function stopAuto() {
  if (!auto.on) return;
  auto.on = false; auto.done = true;
  ghostcur.style.opacity = '0';
  ghostsw.style.display = 'none';
  if (!scanned) dragging = false;
}
addEventListener('pointerdown', () => { if (auto.on) stopAuto(); }, true);
function autoTick(dt) {
  if (!auto.on) return;
  auto.x += (auto.tx - auto.x) * Math.min(1, dt * 4.5);
  auto.y += (auto.ty - auto.y) * Math.min(1, dt * 4.5);
  ghostcur.style.transform = 'translate(' + (auto.x - 11) + 'px,' + (auto.y - 11) + 'px)';
  const near = Math.hypot(auto.x - auto.tx, auto.y - auto.ty) < 16;
  if (auto.wait > 0) { auto.wait -= dt; return; }
  switch (auto.step) {
    case 'toPhone': {
      const [px, py] = projectToPx(phone.position);
      auto.tx = px; auto.ty = py;
      if (near) {
        if (!everDragged) {
          everDragged = true;
          screen.material.map = rt.texture;
          screen.material.needsUpdate = true;
          reticle.visible = true;
        }
        dragging = true;
        auto.step = 'dragPhone';
      }
      break;
    }
    case 'dragPhone': {
      target.x += (0 - target.x) * Math.min(1, dt * 1.6);
      target.z += (0 - target.z) * Math.min(1, dt * 1.6);
      const [px, py] = projectToPx(phone.position);
      auto.tx = px; auto.ty = py;
      if (scanned) { dragging = false; auto.step = 'waitDock'; auto.tx = VW * 0.7; auto.ty = VH * 0.55; }
      break;
    }
    case 'waitDock':
      if (dockPhase === 2) {
        const r = mannbtn.getBoundingClientRect();
        auto.tx = r.left + r.width / 2; auto.ty = r.top + r.height / 2;
        if (near) { auto.wait = 0.35; auto.step = 'clickMann'; }
      }
      break;
    case 'clickMann':
      mannbtn.click();
      auto.step = 'waitFold';
      break;
    case 'waitFold':
      if (foldbtn.classList.contains('prompt')) {
        const r = foldbtn.getBoundingClientRect();
        auto.tx = r.left + r.width / 2; auto.ty = r.top + r.height / 2;
        if (near) { auto.wait = 0.3; auto.step = 'clickFold'; }
      }
      break;
    case 'clickFold':
      foldbtn.click();
      auto.wait = 1.3;
      auto.step = 'toSwatch';
      break;
    case 'toSwatch': {
      const el = swatchesEl.children[3] || swatchesEl.children[0];
      if (!el) { stopAuto(); break; }
      const r = el.getBoundingClientRect();
      auto.tx = r.left + r.width / 2; auto.ty = r.top + r.height / 2;
      if (near) {
        ghostsw.style.backgroundImage = 'url(' + (SWATCHES[3] || SWATCHES[0]).data + ')';
        ghostsw.style.display = 'block';
        auto.step = 'dragSwatch';
      }
      break;
    }
    case 'dragSwatch': {
      const [gx, gy] = projectToPx(new THREE.Vector3(0, 2.0, 0));
      auto.tx = gx; auto.ty = gy;
      ghostsw.style.transform = 'translate(' + (auto.x - 28) + 'px,' + (auto.y - 28) + 'px)';
      if (near) {
        applySwatch(SWATCHES[3] || SWATCHES[0]);
        document.getElementById('txs-swhint').classList.remove('on');
        ghostsw.style.display = 'none';
        auto.step = 'fade';
        auto.wait = 0.5;
      }
      break;
    }
    case 'fade':
      ghostcur.style.opacity = '0';
      auto.on = false; auto.done = true;
      break;
  }
}

const clock = new THREE.Clock();
function frame() {
  if (!inView) { clock.getDelta(); requestAnimationFrame(frame); return; }
  const dt = Math.min(clock.getDelta(), 0.05);
  autoTick(dt);

  // weight: spring toward target, velocity-derived tilt
  if (!scanned) {
  const k = dragging ? 7 : 4;
  vel.x += ((target.x - phone.position.x) * k - vel.x * 8.5) * dt;
  vel.z += ((target.z - phone.position.z) * k - vel.z * 8.5) * dt;
  phone.position.x += vel.x * dt * 8;
  phone.position.z += vel.z * dt * 8;
  const targetY = dragging ? 1.05 : 0.6;
  phone.position.y += (targetY - phone.position.y) * Math.min(1, dt * 6);

  const now = performance.now() / 1000;
  // idle attract: vibrate burst + label flash every few seconds until first grab
  let vib = 0;
  if (!everDragged) {
    const idle = (performance.now() - lastInteract) / 1000;
    const cycle = idle % 3.2;
    const burst = idle > 2.5 && cycle < 0.5;
    if (idle > 8.2 && !auto.on && !auto.done) startAuto();   // two buzzes, then a 2s beat
    if (burst) vib = Math.sin(now * 75) * 0.05 * Math.sin((cycle / 0.5) * Math.PI);
    drawDragMe(burst && Math.floor(now * 7) % 2 === 1);   // pulse-invert only while shaking
  }
  const swayX = dragging ? Math.sin(now * 1.7) * 0.012 : 0;
  const swayZ = (dragging ? Math.sin(now * 2.3 + 1.3) * 0.015 : 0) + vib;
  const tiltX = THREE.MathUtils.clamp(vel.z * 0.35, -0.45, 0.45) + swayX;
  const tiltZ = THREE.MathUtils.clamp(-vel.x * 0.35, -0.45, 0.45) + swayZ;
  phone.rotation.x += (tiltX - phone.rotation.x) * Math.min(1, dt * 8);
  phone.rotation.z += (tiltZ - phone.rotation.z) * Math.min(1, dt * 8);


  // shadow follows, fades with height
  shadow.position.x = phone.position.x;
  shadow.position.z = phone.position.z;
  const h = phone.position.y;
  shadow.material.opacity = THREE.MathUtils.clamp(0.9 - h, 0.25, 0.8);
  const ss = 1 + h * 0.6;
  shadow.scale.set(ss, ss, ss);
  }

  // hold-to-scan: corners grow with hold time, 2s = full; leaving early resets
  const over = Math.hypot(phone.position.x, phone.position.z) < 0.18;   // circles overlapping, small wiggle room
  if (!scanned) {
    if (over) scanT += dt;
    else scanT = Math.max(0, scanT - dt * 3);
    const prog = Math.min(1, scanT / 2);
    const eased = prog * prog * (3 - 2 * prog);
    frameSize = 0.7 + eased * (2.0 - 0.7);
    layoutCorners(frameSize);
    cornerMat.opacity = over ? 0.6 + Math.sin(performance.now() / 90) * 0.35 : 0.85;
    wash.material.opacity = Math.min(1, eased * 1.6);   // invisible until the scan starts
    aim.material.opacity = over ? 1.0 : 0.75;
    setGlowFill(eased);
    if (prog >= 1) {
      scanned = true;
      phase = 1;
      analyseT = 0;
      reticle.visible = false;
      glow.visible = false;
      screen.material.map = analyseTex;
      screen.material.needsUpdate = true;
      setStep(2);
      hint.textContent = 'analysing...';
    }
  }

  // analysing pause, then the phone rises to centre stage and the rain builds
  if (scanned) {
    if (phase === 1) {
      drawAnalyse();
      analyseT += dt;
      if (analyseT > 1.3) {
        phase = 2;
        presentT = 0;
        phoneStart.copy(phone.position);
        qStart.copy(phone.quaternion);
        hint.textContent = 'generating digital replica...';
      }
    } else {
      presentT += dt;
      const pp = Math.min(1, presentT / 2.0);
      const e2 = pp * pp * (3 - 2 * pp);
      phone.position.lerpVectors(phoneStart, phoneTarget, e2);
      phone.quaternion.slerpQuaternions(qStart, qTarget, e2);
      fabric.material.opacity = 1 - e2;
      shadow.material.opacity = Math.max(0, 0.8 * (1 - pp * 2));
      cornerMat.opacity = Math.max(0, 0.85 * (1 - pp * 1.3));
      wash.material.opacity = Math.max(0, wash.material.opacity - dt * 1.2);
      aim.material.opacity = Math.max(0, 0.9 * (1 - pp * 1.3));
      if (phase === 2) {
        drawAnalyse();
        if (pp >= 1) {
          phase = 3;
          screen.material.map = rainTex;
          screen.material.needsUpdate = true;
        }
      }
      if (phase === 3 && dockPhase === 0) {
        drawRain(dt * 60);
        blogT += dt;
        blog.classList.add('show');
        bdots.textContent = ' ' + '. '.repeat(1 + Math.floor(performance.now() / 380) % 3).trim();
        blogLines.forEach((el, i) => { if (blogT > 0.5 + i * 0.55) el.classList.add('on'); });
      }
      if (phase === 3 && rainDone && dockPhase === 0) {
        dockPhase = 1;
        drainT = 0;
        dock.classList.add('up');
        blog.classList.remove('show');
        hint.textContent = 'saving replica...';
      }
      if (dockPhase === 1) {
        drainT += dt;
        if (drainT > 0.8) {                       // dock settles, then the drain starts
          const empty = drawDrain(dt * 60);
          if (Math.random() < 0.55) spawnMote();
          if (empty) {
            dockPhase = 2;
            mannbtn.classList.add('prompt');
            hint.textContent = 'open the 3D software';
          }
        }
      }
      if (garmentT >= 0 && garmentT < 1) {
        garmentT = Math.min(1, garmentT + dt / 0.8);
        const ge = garmentT * garmentT * (3 - 2 * garmentT);
        garment.scale.set(ge, ge, ge);
        // phone steps aside as the garment arrives
        phone.position.x = ge * 6;
        if (garmentT >= 1) phone.visible = false;
      }
      tickMotes(dt);
    }
  }

  // magnifier: render-to-texture from just under the phone
  if (!scanned) {
    rtCam.position.set(phone.position.x, Math.max(1.6, phone.position.y + 1.2), phone.position.z);
    phone.visible = false; shadow.visible = false;
    renderer.setRenderTarget(rt);
    renderer.render(scene, rtCam);
    renderer.setRenderTarget(null);
    phone.visible = true; shadow.visible = true;
  }

  // cloth uniforms: time + smoothed spin velocity
  if (scrU) {
    scrU.uRetOn.value = reticle.visible ? 0.85 : 0;
    scrU.uFill.value = scrState.fill;
  }
  const rv = (garment.rotation.y - lastRotY) / Math.max(dt, 0.001);
  lastRotY = garment.rotation.y;
  spinVel += (THREE.MathUtils.clamp(rv, -6, 6) - spinVel) * Math.min(1, dt * 5);
  for (const u of windUs) {
    u.uTime.value = performance.now() / 1000;
    u.uSpin.value = spinVel;
  }

  // garment stage: camera eases to a straight-on front view, slider controls dolly
  if (viewMode === 1) {
    camBlend = Math.min(1, camBlend + dt / 1.2);
    const ce = camBlend * camBlend * (3 - 2 * camBlend);
    const z01 = zoomEl.value / 100;
    frontLook.y = 2.0 + z01 * 0.6;                  // zooming converges on her chest
    dial.position.y = 0.62 + z01 * 0.95;            // rests above the swatch tray, rises to just below her hands
    const goal = frontLook.clone().add(frontDir.clone().multiplyScalar(frontDist()));
    camera.position.lerpVectors(scanCamPos, goal, ce);
    camera.lookAt(scanLook.clone().lerp(frontLook, ce));
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const onStageResize = () => {
  VW = host.clientWidth; VH = host.clientHeight;
  camera.aspect = VW/VH;
  camera.updateProjectionMatrix();
  renderer.setSize(VW, VH);
};
addEventListener('resize', onStageResize);
new ResizeObserver(onStageResize).observe(host);
new IntersectionObserver((en) => {
  const was = inView; inView = en[0].isIntersecting;
  if (inView && !was) lastInteract = performance.now();
}, { threshold: 0.2 }).observe(host);

}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
