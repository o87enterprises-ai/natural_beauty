import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildMolecule } from './molecule.js';
import logoData from './logo-shapes.json';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const damp = (cur, target, rate, dt) => lerp(cur, target, 1 - Math.exp(-rate * dt));

// Lighter rendering on phones: less GPU memory means fewer failed or lost WebGL contexts.
const LITE = typeof window !== 'undefined' && ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || Math.min(window.innerWidth, window.innerHeight) < 700);

const R = 1;            // tub radius
const BODY_H = 1.1;
const TOP = BODY_H / 2;

const CREAM = '#efe9e1';

/* ---------- canvas textures ---------- */
function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  const lines = [];
  words.forEach((w) => {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  });
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return lines.length;
}

function labelTexture(p, anisotropy) {
  const W = 4096, H = 720, q = LITE ? 0.5 : 1;
  const c = makeCanvas(W * q, H * q); const ctx = c.getContext('2d'); ctx.scale(q, q);
  ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
  // subtle paper grain
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(80,70,55,${Math.random() * 0.035})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  const Y = (y) => (0.5 - y / BODY_H) * H;           // jar y (units) -> px
  const px = (u) => u * W;                             // u (0..1 around) -> px, 0.5 = front centre
  const font = (w, s) => `${w} ${s}px Montserrat, 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = '#0e0e0e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.letterSpacing = '0px';

  // FRONT (centre of the canvas)
  const fx = px(0.5);
  ctx.font = font(600, 46); ctx.letterSpacing = '14px';
  ctx.fillText('NATURAL BEAUTY', fx + 7, Y(-0.06));
  ctx.letterSpacing = '0px';
  ctx.fillRect(fx - 90, Y(-0.15), 180, 3);
  ctx.font = font(700, 74); ctx.letterSpacing = '4px';
  ctx.fillText(p.name.toUpperCase(), fx, Y(-0.27));
  ctx.letterSpacing = '8px'; ctx.font = font(500, 34); ctx.fillStyle = '#5b554d';
  ctx.fillText(p.line.toUpperCase(), fx + 4, Y(-0.385));
  ctx.fillStyle = '#0e0e0e'; ctx.letterSpacing = '6px'; ctx.font = font(500, 30);
  ctx.fillText(`NET WT ${p.size.toUpperCase()}`, fx + 3, Y(-0.485));

  // RIGHT / LEFT: ingredients and directions (wrap around the tub)
  ctx.letterSpacing = '0px'; ctx.textAlign = 'left';
  const colX = px(0.5) + 900;
  ctx.font = font(700, 30); ctx.letterSpacing = '8px';
  ctx.fillText('INGREDIENTS', colX, Y(0.38));
  ctx.letterSpacing = '0px'; ctx.font = font(400, 36); ctx.fillStyle = '#2a2723';
  wrapText(ctx, p.ingredients.join(', ') + '.', colX, Y(0.26), 900, 52);
  ctx.fillStyle = '#0e0e0e'; ctx.font = font(700, 30); ctx.letterSpacing = '8px';
  ctx.fillText('HOW TO USE', colX, Y(-0.06));
  ctx.letterSpacing = '0px'; ctx.font = font(400, 36); ctx.fillStyle = '#2a2723';
  wrapText(ctx, p.directions, colX, Y(-0.18), 900, 52);

  const bx = px(0.5) - 900 - 900;
  ctx.fillStyle = '#0e0e0e'; ctx.font = font(700, 30); ctx.letterSpacing = '8px';
  ctx.fillText('ALL NATURAL', bx, Y(0.38));
  ctx.letterSpacing = '0px'; ctx.font = font(400, 36); ctx.fillStyle = '#2a2723';
  wrapText(ctx, 'Made in small batches with plant-based ingredients. Free from synthetic fragrance.', bx, Y(0.26), 900, 52);
  ctx.fillStyle = '#0e0e0e'; ctx.font = font(700, 30); ctx.letterSpacing = '8px';
  ctx.fillText('NATURALBEAUTY', bx, Y(-0.06));
  ctx.letterSpacing = '0px'; ctx.font = font(400, 36); ctx.fillStyle = '#2a2723';
  ctx.fillText('Concept preview · placeholder copy', bx, Y(-0.18));

  // faint hairlines top/bottom
  ctx.fillStyle = 'rgba(14,14,14,.35)';
  ctx.fillRect(0, Y(0.5) + 14, W, 2); ctx.fillRect(0, Y(-0.5) - 16, W, 2);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = anisotropy;
  t.wrapS = THREE.RepeatWrapping; t.offset.x = 0.5;   // front centre faces +z
  return t;
}

function creamTexture() {
  const S = LITE ? 1024 : 2048, k = S / 512; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S * 0.4, S * 0.35, 20 * k, S / 2, S / 2, S * 0.7);
  g.addColorStop(0, '#fbf7f0'); g.addColorStop(1, '#e6dccb');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  ctx.lineWidth = 7 * k; ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const rad = (14 + i * 9) * k; const a0 = i * 0.6;
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,.55)' : 'rgba(190,172,146,.35)';
    ctx.beginPath(); ctx.arc(S / 2 + Math.cos(i) * 6 * k, S / 2 + Math.sin(i) * 6 * k, rad, a0, a0 + 3.8 + (i % 3) * 0.4); ctx.stroke();
  }
  // fine grain so the cream still reads as a surface when the camera is close
  for (let i = 0; i < 60000; i++) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '170,150,120'},${Math.random() * 0.07})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function stoneTexture() {
  const S = 512; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
  ctx.fillStyle = '#d9cfc0'; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 14000; i++) {
    const v = 150 + Math.random() * 90;
    ctx.fillStyle = `rgba(${v},${v - 8},${v - 24},${Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function leafLightMap() {
  const S = 1024; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, S, S);
  ctx.filter = 'blur(14px)'; ctx.fillStyle = 'rgba(40,40,40,.88)';
  const leaf = (x, y, len, wid, rot) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.25, -wid, len * 0.75, -wid * 0.8, len, 0);
    ctx.bezierCurveTo(len * 0.75, wid * 0.8, len * 0.25, wid, 0, 0); ctx.fill(); ctx.restore();
  };
  const branch = (x, y, ang, n, len) => {
    ctx.save(); ctx.filter = 'blur(6px)'; ctx.strokeStyle = 'rgba(40,40,40,.85)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x, y);
    const ex = x + Math.cos(ang) * len * n * 0.6, ey = y + Math.sin(ang) * len * n * 0.6;
    ctx.quadraticCurveTo((x + ex) / 2, (y + ey) / 2 - 60, ex, ey); ctx.stroke(); ctx.restore();
    for (let i = 0; i < n; i++) {
      const t = i / n; const bx = lerp(x, ex, t), by = lerp(y, ey, t) - Math.sin(t * Math.PI) * 30;
      leaf(bx, by, len, len * 0.32, ang + (i % 2 ? 0.9 : -0.9) + Math.sin(i) * 0.2);
    }
  };
  branch(-20, 90, 0.35, 9, 190);
  branch(-30, 330, 0.15, 7, 160);
  branch(60, -20, 1.0, 6, 150);
  // soft diagonal light streak toward the top right
  ctx.filter = 'blur(40px)'; ctx.fillStyle = 'rgba(40,40,40,.55)';
  ctx.save(); ctx.translate(S * 0.78, S * 0.1); ctx.rotate(0.9); ctx.fillRect(-60, -300, 120, 1200); ctx.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function haloTexture() {
  const S = 128; const c = makeCanvas(S, S); const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,226,170,.9)'); g.addColorStop(0.35, 'rgba(255,205,130,.28)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

/* ---------- monogram geometry (traced from the brand logo, see tools/trace_logo.py) ---------- */
function monogramShapes() {
  return logoData.shapes.map((sh) => {
    const shape = new THREE.Shape(sh.outline.map((p) => new THREE.Vector2(p[0], p[1])));
    sh.holes.forEach((h) => shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1])))));
    return shape;
  });
}

/* ---------- main factory ---------- */
export function createScene(canvas) {
  // Try the best settings first, then progressively gentler ones before giving up.
  let renderer = null, lastErr = null;
  for (const opts of [{ antialias: true, powerPreference: 'high-performance' }, { antialias: false, powerPreference: 'default' }, { antialias: false, powerPreference: 'low-power' }]) {
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: false, ...opts }); break; } catch (err) { lastErr = err; }
  }
  if (!renderer) throw lastErr || new Error('WebGL unavailable');
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);   // lets the browser restore it
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LITE ? 1.5 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const anisotropy = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const bgLight = new THREE.Color(CREAM); const bgDark = new THREE.Color('#0b0a09');
  scene.background = bgLight.clone();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
  camera.position.set(0, 0.6, 6.4);

  /* --- stage (wall, floor, plinths, lights) --- */
  const stage = new THREE.Group(); scene.add(stage);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#efe9e1', roughness: 1 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), wallMat);
  wall.position.set(0, 4, -4.2); wall.receiveShadow = true; stage.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: '#ece5db', roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.93; floor.receiveShadow = true; stage.add(floor);

  const stoneMap = stoneTexture(); stoneMap.repeat.set(2, 1);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneMap, roughness: 0.95, color: '#ddd5c8' });
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.36, 2.4, 6, 0.06), stoneMat);
  plinth.position.set(0, -0.75, 0); plinth.castShadow = plinth.receiveShadow = true; stage.add(plinth);
  const blockL = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.8, 1.6, 4, 0.08), stoneMat);
  blockL.position.set(-5.4, -0.53, 1.4); blockL.rotation.y = 0.2; blockL.castShadow = blockL.receiveShadow = true; stage.add(blockL);
  const blockR = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.5, 1.8, 4, 0.05), stoneMat);
  blockR.position.set(5.6, -0.68, 0.4); blockR.rotation.y = -0.15; blockR.castShadow = blockR.receiveShadow = true; stage.add(blockR);

  const spot = new THREE.SpotLight('#fff3e0', 260, 60, 0.62, 1, 1.6);
  spot.position.set(-3.5, 5.5, 8); spot.target.position.set(0, 0.2, -1);
  spot.castShadow = true; spot.shadow.mapSize.set(LITE ? 1024 : 2048, LITE ? 1024 : 2048); spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.02; spot.shadow.radius = 5;
  spot.map = leafLightMap(); scene.add(spot, spot.target);
  const fill = new THREE.HemisphereLight('#fff6ea', '#cfc3b0', 0.55); scene.add(fill);
  const lightsJar = [spot, fill];

  const molLights = new THREE.Group();
  const m1 = new THREE.PointLight('#ffd9a0', 90, 30, 1.6); m1.position.set(-4, 3, 5);
  const m2 = new THREE.PointLight('#a9c7b4', 50, 30, 1.6); m2.position.set(5, -2, 4);
  const m3 = new THREE.PointLight('#ffffff', 30, 30, 1.6); m3.position.set(0, 4, -3);
  molLights.add(m1, m2, m3); molLights.visible = false; scene.add(molLights);

  /* --- jar --- */
  const jar = new THREE.Group(); scene.add(jar);
  const bodyMats = [
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    new THREE.MeshStandardMaterial({ map: creamTexture(), roughness: 0.55 }),
    new THREE.MeshStandardMaterial({ color: '#e9e2d6', roughness: 0.8 }),
  ];
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, BODY_H, 128, 1), bodyMats);
  body.castShadow = body.receiveShadow = true; jar.add(body);
  const topCap = bodyMats[1];

  // lid with bevel + grip ridges (lathe)
  const lidProfile = [];
  const LID_H = 0.42;
  lidProfile.push(new THREE.Vector2(0.001, 0));
  lidProfile.push(new THREE.Vector2(R * 1.045 - 0.05, 0));
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; lidProfile.push(new THREE.Vector2(R * 1.045 - 0.05 + Math.sin(a) * 0.05, 0.05 - Math.cos(a) * 0.05)); }
  lidProfile.push(new THREE.Vector2(R * 1.045, LID_H - 0.07));
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; lidProfile.push(new THREE.Vector2(R * 1.045 - 0.07 + Math.cos(a) * 0.07, LID_H - 0.07 + Math.sin(a) * 0.07)); }
  lidProfile.push(new THREE.Vector2(0.001, LID_H));
  const lidMat = new THREE.MeshPhysicalMaterial({ color: '#0d0d0d', roughness: 0.38, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  const lidMesh = new THREE.Mesh(new THREE.LatheGeometry(lidProfile, 128), lidMat);
  lidMesh.castShadow = lidMesh.receiveShadow = true;
  const lid = new THREE.Group(); lid.add(lidMesh);
  lidMesh.position.set(0, 0, R);                 // hinge at the back edge: group origin there, mesh offset forward
  lid.position.set(0, TOP, -R);
  jar.add(lid);

  // monogram
  const logo = new THREE.Group(); jar.add(logo);
  const logoMat = new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.28, metalness: 0.25, transparent: true });
  const LOGO_H = 0.32;
  const mk = (shape) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.003, bevelSegments: 2, curveSegments: 12 });
    g.translate(0, -0.5, -0.07); g.scale(LOGO_H, LOGO_H, LOGO_H); return g;
  };
  const letterGeos = monogramShapes().map(mk);
  const letterFlat = letterGeos.map((g) => g.attributes.position.array.slice());
  const letterNormals = letterGeos.map((g) => g.attributes.normal.array.slice());
  const letterMeshes = letterGeos.map((g) => { const m = new THREE.Mesh(g, logoMat); m.castShadow = true; logo.add(m); return m; });
  const LOGO_Y = 0.28;
  function bendLogo(b) {
    letterGeos.forEach((g, k) => {
      const pos = g.attributes.position, nor = g.attributes.normal; const flat = letterFlat[k], fn = letterNormals[k];
      for (let i = 0; i < pos.count; i++) {
        const x = flat[i * 3], y = flat[i * 3 + 1], z = flat[i * 3 + 2];
        const a = x / R;
        pos.setXYZ(i, lerp(x, R * Math.sin(a), b), y, z + b * (R * Math.cos(a) - R));
        // rotate the flat normal with the bend (smooth shading; recomputing would facet the big flat triangles)
        const ang = a * b, c = Math.cos(ang), sn = Math.sin(ang);
        const nx = fn[i * 3], nz = fn[i * 3 + 2];
        nor.setXYZ(i, nx * c + nz * sn, fn[i * 3 + 1], -nx * sn + nz * c);
      }
      pos.needsUpdate = true; nor.needsUpdate = true;
    });
  }
  let lastBend = -1;

  /* --- plinth shadow catcher glow under jar for molecule hand-off not needed --- */

  /* --- molecule mode --- */
  const molRoot = new THREE.Group(); molRoot.visible = false; scene.add(molRoot);
  const molSlots = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
  molSlots.forEach((g) => molRoot.add(g));
  const atomGeo = new THREE.SphereGeometry(1, 36, 24);
  const bondGeo = new THREE.CylinderGeometry(1, 1, 1, 14, 1);
  const elMat = {};
  const elStyle = { C: ['#e9e0d0', 0.12, 0.9], O: ['#f0b862', 0.5, 1.05], N: ['#9cc4ac', 0.4, 0.95], H: ['#fffaf0', 0.5, 0.55] };
  Object.entries(elStyle).forEach(([el, [col, em]]) => {
    elMat[el] = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: em * 0.55, roughness: 0.28, metalness: 0.1 });
  });
  const bondMat = new THREE.MeshStandardMaterial({ color: '#cfc5b3', emissive: '#6b5b3c', emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.3 });
  const halo = haloTexture();
  const haloMat = new THREE.SpriteMaterial({ map: halo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 });
  let molInfo = [null, null, null];

  function clearSlot(g) {
    while (g.children.length) {
      const ch = g.children.pop();
      if (ch.isSprite) continue;
    }
  }
  function fillSlot(slot, def, idx) {
    clearSlot(slot);
    const mol = buildMolecule(`${def.name}-${idx}`, def.kind);
    const inner = new THREE.Group(); slot.add(inner); slot.userData.inner = inner;
    mol.atoms.forEach((a) => {
      const size = a.el === 'H' ? 0.15 : a.el === 'C' ? 0.27 : 0.3;
      const m = new THREE.Mesh(atomGeo, elMat[a.el]); m.scale.setScalar(size * mol.scale * 1.5 * (a.el === 'H' ? 1.2 : 1));
      m.position.set(...a.p); inner.add(m);
    });
    mol.bonds.forEach(([i, j]) => {
      const a = new THREE.Vector3(...mol.atoms[i].p), b = new THREE.Vector3(...mol.atoms[j].p);
      const len = a.distanceTo(b); const m = new THREE.Mesh(bondGeo, bondMat);
      m.scale.set(0.045, len, 0.045); m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); inner.add(m);
    });
    const sp = new THREE.Sprite(haloMat); sp.scale.setScalar(4.6); slot.add(sp);
    slot.userData.phase = idx * 2.1;
    molInfo[idx] = { name: def.name, note: def.note, formula: mol.formula };
  }

  // floating particles for depth
  const pCount = 260; const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) { pPos[i * 3] = (Math.random() - 0.5) * 18; pPos[i * 3 + 1] = (Math.random() - 0.5) * 11; pPos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2; }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const motes = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: '#ffe6bd', size: 0.045, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  molRoot.add(motes);

  /* --- state --- */
  const d = { lift: 0, zoom: 0, lid: 0, product: 0, fin: 0, shiftX: 0, shiftY: 0, bev: 0, dive: 0, molIn: 0 };
  const target = { lift: 0, zoom: 0, lid: 0, product: 0, fin: 0, shiftX: 0, shiftY: 0, bev: 0, dive: 0 };
  let molReveal = [0, 0, 0];
  let introT = 0, introOn = false, introDur = 3.4;
  let time = 0, mol = false, userRot = 0, userTilt = 0, velRot = 0, dragging = false, lastDrag = 0, autoSpin = false;
  let molRotX = 0, molRotY = 0;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  let currentProduct = null, pending = null, swapT = 1;
  let aspect = 1, isNarrow = false, molScale = 0.72, molProg = 0, molProgT = 0;

  function applyProduct(p) {
    const old = bodyMats[0].map;
    bodyMats[0].map = labelTexture(p, anisotropy); bodyMats[0].needsUpdate = true;
    if (old) old.dispose();
    p.molecules.forEach((m, i) => fillSlot(molSlots[i], m, i));
    currentProduct = p;
  }

  function layoutMolecules() {
    const pos = isNarrow ? [[0, 2.7, 0], [0, 0.5, 0], [0, -1.7, 0]] : [[-0.9, 0.9, 0], [2.9, 0.9, 0], [1.0, -0.85, 0]];
    molScale = isNarrow ? 0.5 : 0.72;
    molSlots.forEach((g, i) => { g.userData.base = new THREE.Vector3(...pos[i]); g.position.copy(g.userData.base); g.scale.setScalar(molScale); });
  }

  function resize(w, h) {
    renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; isNarrow = aspect < 0.9;
    camera.fov = isNarrow ? 44 : 32; camera.updateProjectionMatrix(); layoutMolecules();
  }

  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3();
  const heroPos = new THREE.Vector3(0, 0.6, 6.4), heroTgt = new THREE.Vector3(0, 0.1, 0);
  const P1 = new THREE.Vector3(0, 0.6, 3.0), T1 = new THREE.Vector3(0, 0.2, 0);
  const P2 = new THREE.Vector3(0, 3.6, 2.7), T2 = new THREE.Vector3(0, 0.35, -0.2);
  const Pp = new THREE.Vector3(0, 0.55, 7.6), Tp = new THREE.Vector3(0, 0, 0);
  const Pf = new THREE.Vector3(0.7, 1.15, 7.0), Tf = new THREE.Vector3(0, 0.15, 0);
  const PB = new THREE.Vector3(0, 5.2, 0.55), TB = new THREE.Vector3(0, 0.45, 0);     // bird's-eye above the open tub
  const PD = new THREE.Vector3(0, 1.5, 0.12), TD = new THREE.Vector3(0, 0.5, 0);      // down into the cream

  function update(dt) {
    dt = Math.min(dt, 0.4); time += dt;
    ['lift', 'zoom', 'lid', 'product', 'fin', 'shiftX', 'shiftY', 'bev', 'dive'].forEach((k) => { d[k] = damp(d[k], target[k], k === 'shiftX' || k === 'shiftY' ? 4 : k === 'bev' || k === 'dive' ? 5 : 3, dt); });
    mouse.sx = damp(mouse.sx, mouse.x, 3, dt); mouse.sy = damp(mouse.sy, mouse.y, 3, dt);
    if (introOn && introT < 1) introT = clamp(introT + dt / introDur);
    const it = easeOut(introT);

    // ---- jar pose
    const lock = clamp(d.lift * 4 + d.fin * 2.5 + d.bev * 3);
    if (!dragging) {
      userRot += velRot * dt; velRot = damp(velRot, 0, 2.2, dt);
      userTilt = damp(userTilt, 0, 1.6, dt);
      if (autoSpin && time - lastDrag > 1.8 && !mol) userRot += dt * 0.32;
    }
    const nearest = Math.round(userRot / (Math.PI * 2)) * Math.PI * 2;
    const rotUser = lerp(userRot, nearest, lock);
    const sway = Math.sin(time * 0.5) * 0.1 * (1 - d.product) * (1 - lock);
    jar.rotation.y = rotUser + sway + (1 - it) * Math.PI * 5;
    jar.rotation.x = userTilt * (1 - lock) + (1 - it) * 0.5 * Math.sin(time * 3) * 0 + 0.0;
    jar.position.y = Math.sin(time * 1.1) * 0.025 + (1 - it) * 2.4 + (1 - it) * Math.sin(time * 2.4) * 0.05;
    // swap tween
    let swapScale = 1;
    if (swapT < 1) {
      swapT = clamp(swapT + dt / 0.9);
      if (swapT > 0.45 && pending) { applyProduct(pending); pending = null; }
      swapScale = 1 - 0.14 * Math.sin(swapT * Math.PI);
      jar.rotation.y += (1 - easeOut(swapT)) * Math.PI * 1.2;
    }
    jar.scale.setScalar((0.55 + 0.45 * it) * swapScale);
    plinth.material.opacity = 1;

    // ---- lid
    const lidAng = d.lid * 1.95;
    lid.rotation.x = -lidAng; lid.position.y = TOP + d.lid * 0.04;

    // ---- logo lift-off + fly-through
    const lz = R + 0.012 + d.lift * 2.15;
    logo.position.set(0, LOGO_Y + d.lift * 0.18 + Math.sin(time * 1.4) * 0.015 * d.lift, lz);
    const through = clamp((d.zoom - 0.22) / 0.4);
    const lscale = 1 + d.lift * 0.85 + through * through * 7;
    logo.scale.setScalar(lscale);
    logo.rotation.set(Math.sin(time * 0.9) * 0.05 * d.lift, Math.sin(time * 0.7) * 0.12 * d.lift, 0);
    const bendAmt = clamp(1 - d.lift * 1.4);
    if (Math.abs(bendAmt - lastBend) > 0.002) { bendLogo(bendAmt); lastBend = bendAmt; }
    logoMat.opacity = 1 - clamp((through - 0.55) / 0.35);
    logo.visible = logoMat.opacity > 0.01;

    // ---- camera
    const a = ease(clamp(d.zoom / 0.5)), b = ease(clamp((d.zoom - 0.5) / 0.5));
    tmpP.copy(heroPos).lerp(P1, a).lerp(P2, b); tmpT.copy(heroTgt).lerp(T1, a).lerp(T2, b);
    tmpP.lerp(Pp, d.product); tmpT.lerp(Tp, d.product);
    tmpP.lerp(Pf, d.fin); tmpT.lerp(Tf, d.fin);
    tmpP.lerp(PB, d.bev); tmpT.lerp(TB, d.bev);
    tmpP.lerp(PD, d.dive); tmpT.lerp(TD, d.dive);
    if (isNarrow) { tmpP.z *= 1.12; tmpP.y += 0.15; }
    const dist = tmpP.distanceTo(tmpT);
    const viewW = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect;
    const viewH = viewW / aspect;
    const sx = -viewW * 0.14 * d.shiftX, sy = -viewH * 0.045 * d.shiftY;
    tmpP.x += sx + mouse.sx * 0.28; tmpT.x += sx; tmpP.y += sy + mouse.sy * 0.12; tmpT.y += sy;

    // ---- molecule mode
    if (mol) {
      d.molIn = clamp(d.molIn + dt / 1.1);
      molProg = damp(molProg, molProgT, 4, dt);
      tmpP.set(mouse.sx * 0.5 + sx * 1.7, mouse.sy * 0.3 + sy, (isNarrow ? 12 : 10) - molProg * (isNarrow ? 0.8 : 1.0)); tmpT.set(sx * 1.7, sy, 0);
      molSlots.forEach((g, i) => {
        const ph = g.userData.phase + time * 0.6;
        g.position.copy(g.userData.base); g.position.y += Math.sin(ph) * 0.12;
        g.rotation.y = time * 0.45 + i * 1.7 + molRotY + molProg * Math.PI * 1.4; g.rotation.x = Math.sin(time * 0.3 + i) * 0.25 + molRotX;
        const r = molReveal[i]; g.visible = r > 0.01; g.scale.setScalar(molScale * lerp(0.15, 1, r));
      });
      motes.rotation.y = time * 0.02; motes.position.y = Math.sin(time * 0.2) * 0.2;
      halo.needsUpdate = false;
    }
    camera.position.copy(tmpP); camera.lookAt(tmpT);
    spot.position.x = -3.5 + Math.sin(time * 0.35) * 0.35; spot.position.y = 5.5 + Math.cos(time * 0.27) * 0.2;
    renderer.render(scene, camera);
  }

  function setMol(on) {
    mol = on; molRoot.visible = on; molLights.visible = on;
    jar.visible = !on; stage.visible = !on; lightsJar.forEach((l) => (l.visible = !on));
    scene.background = on ? bgDark : bgLight; scene.environmentIntensity = on ? 0.18 : 0.55;
    if (on) { d.molIn = 0; molRotX = molRotY = 0; }
  }

  return {
    resize, update, setMol,
    start() { introOn = true; },
    skipIntro() { introT = 1; introOn = true; },
    set(k, v) { target[k] = v; },
    setProduct(p, immediate) {
      if (!currentProduct || immediate) { applyProduct(p); pending = null; swapT = 1; return; }
      if (p.id === currentProduct.id || (pending && pending.id === p.id)) return;
      pending = p; swapT = 0; userRot = 0; velRot = 0; userTilt = 0;
    },
    // Back to the very first frame: jar high above the plinth, intro will replay.
    reset() {
      Object.keys(target).forEach((k) => { target[k] = 0; d[k] = 0; });
      d.molIn = 0; introT = 0; introOn = true; userRot = 0; velRot = 0; userTilt = 0; swapT = 1; pending = null;
      molProg = 0; molProgT = 0; molReveal = [0, 0, 0];
    },
    setAutoSpin(v) { autoSpin = v; },
    setMolReveal(arr) { molReveal = arr; },
    setMolProgress(v) { molProgT = v; },
    pointer(x, y) { mouse.x = x; mouse.y = y; },
    dragStart() { dragging = true; velRot = 0; },
    drag(dx, dy, touch) {
      const s = 0.0075;
      if (mol) { molRotY += dx * s * 1.1; if (!touch) molRotX = clamp(molRotX + dy * s, -0.9, 0.9); return; }
      userRot += dx * s * 1.3; velRot = (dx * s * 1.3) / 0.016;
      if (!touch) userTilt = clamp(userTilt + dy * s, -0.5, 0.6);
      lastDrag = time;
    },
    dragEnd() { dragging = false; lastDrag = time; velRot = THREE.MathUtils.clamp(velRot, -6, 6); },
    getMolecules() { return molInfo; },
    molScreen(i) {
      const g = molSlots[i]; const v = new THREE.Vector3(0, -1.6 * molScale, 0).add(g.position).project(camera);
      return { x: (v.x * 0.5 + 0.5) * renderer.domElement.clientWidth, y: (-v.y * 0.5 + 0.5) * renderer.domElement.clientHeight };
    },
    get molIn() { return d.molIn; },
    get introProgress() { return introT; },
    isMol: () => mol,
    renderer,
  };
}
