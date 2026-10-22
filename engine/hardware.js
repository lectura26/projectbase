// Beslag og værktøj som 3D-modeller. Alle mål i mm.
// Konvention for beslag der stikkes/skrues i: lokal +Y er indføringsretningen (ind i materialet),
// origo ligger i anlægsfladen (hvor hovedet møder overfladen). Hovedet ligger ved y < 0.
// Gevind er højregang: et skrue strammes ved positiv rotation om +Y (= med uret set fra hovedet).

import * as THREE from 'three';

const cache = new Map();
const once = (key, make) => (cache.has(key) ? cache.get(key) : (cache.set(key, make()), cache.get(key)));

export const MAT = {
  zinc: new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 0.85, roughness: 0.32 }),
  steel: new THREE.MeshStandardMaterial({ color: '#9aa0a8', metalness: 0.9, roughness: 0.38 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: '#4b4f56', metalness: 0.7, roughness: 0.45 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c8a45a', metalness: 0.85, roughness: 0.35 }),
  recess: new THREE.MeshBasicMaterial({ color: '#22252b' }),
  beech: new THREE.MeshStandardMaterial({ color: '#d9b98a', roughness: 0.85 }),
  whitePlastic: new THREE.MeshStandardMaterial({ color: '#f1f1ee', roughness: 0.55 }),
  greyPlastic: new THREE.MeshStandardMaterial({ color: '#b9bcc0', roughness: 0.6 }),
  blackPlastic: new THREE.MeshStandardMaterial({ color: '#202226', roughness: 0.55 }),
  runner: new THREE.MeshStandardMaterial({ color: '#9ea4ab', metalness: 0.55, roughness: 0.4 }),   // grey steel, stands out from white panels
  nylon: new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: 0.35 }),
  handle: new THREE.MeshStandardMaterial({ color: '#f4f4f2', metalness: 0.35, roughness: 0.35 }),
  // tools
  rubberBlack: new THREE.MeshStandardMaterial({ color: '#25272b', roughness: 0.8 }),
  phillipsGrip: new THREE.MeshStandardMaterial({ color: '#1b3d84', roughness: 0.5 }),
  flatGrip: new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.5 }),
  ash: new THREE.MeshStandardMaterial({ color: '#c9a77a', roughness: 0.7 }),
  tapeYellow: new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.5 }),
  tapeBlade: new THREE.MeshStandardMaterial({ color: '#f5dc5a', roughness: 0.4, metalness: 0.2 }),
  pencil: new THREE.MeshStandardMaterial({ color: '#e8b923', roughness: 0.6 }),
  graphite: new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: 0.4 }),
  drillBody: new THREE.MeshStandardMaterial({ color: '#2e6b4f', roughness: 0.45 }),
};
MAT.recess.polygonOffset = true; MAT.recess.polygonOffsetFactor = -2;

const shadow = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const mesh = (g, m) => new THREE.Mesh(g, m);

// ---------- geometry helpers ----------
function lathe(points, segs = 32) { return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs); }

// right-hand helical thread ridge from y0 to y1 around radius r
function threadGeo(r, y0, y1, pitch, ridge, taperTo = null) {
  return once(`thr:${r}:${y0}:${y1}:${pitch}:${ridge}:${taperTo}`, () => {
    const turns = (y1 - y0) / pitch, n = Math.max(24, Math.ceil(turns * 24));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, y = y0 + t * (y1 - y0), th = t * turns * Math.PI * 2;
      const rr = taperTo === null ? r : r + (taperTo - r) * Math.max(0, (t - 0.8) / 0.2);
      pts.push(new THREE.Vector3(rr * Math.cos(th), y, -rr * Math.sin(th)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, ridge, 5, false);
  });
}
function phillips(g, r, y, faceDir = -1) {   // cross recess on a head face at height y, seen from -Y
  const w = r * 1.3, t = r * 0.28;
  for (const rot of [0, Math.PI / 2]) {
    const b = mesh(new THREE.BoxGeometry(w, 0.6, t), MAT.recess);
    b.position.y = y + faceDir * 0.05; b.rotation.y = rot; g.add(b);
  }
}
function slot(g, r, y, faceDir = -1) {
  const b = mesh(new THREE.BoxGeometry(r * 1.9, 0.6, r * 0.28), MAT.recess);
  b.position.y = y + faceDir * 0.05; g.add(b);
}

// ---------- fasteners (insertion axis +Y, origin at bearing surface) ----------
function screw({ d, len, head = 'csk', headD, pitch, point = true, mat = MAT.zinc, drive = 'ph' }) {
  const g = new THREE.Group(), r = d / 2 - 0.35;
  const tipLen = point ? d * 0.9 : 0.4;
  g.add(mesh(lathe([[0, len], [point ? 0.2 : r * 0.8, len], [r, len - tipLen], [r, 0], [0, 0]], 20), mat));
  g.add(mesh(threadGeo(r, 0.6, len - tipLen * 0.4, pitch, d * 0.09, point ? 0.4 : null), mat));
  const hr = headD / 2;
  let face;
  if (head === 'csk') { g.add(mesh(lathe([[r, 0], [hr, -hr * 0.55], [hr, -hr * 0.7], [0, -hr * 0.7]], 28), mat)); face = -hr * 0.7; }
  else if (head === 'pan') { g.add(mesh(lathe([[0, 0], [hr, 0], [hr, -hr * 0.35], [hr * 0.75, -hr * 0.65], [0, -hr * 0.7]], 28), mat)); face = -hr * 0.7; }
  else if (head === 'euro') { g.add(mesh(lathe([[r, 0], [hr, -hr * 0.4], [hr, -hr * 0.62], [0, -hr * 0.62]], 28), mat)); face = -hr * 0.62; }
  (drive === 'ph' ? phillips : slot)(g, hr, face);
  return shadow(g);
}

const BUILD = {
  // A: cam bolt (excenterbolt) Ø6×35 — 11 mm wood thread goes into the panel, shank + ball head stay out
  A() {
    const g = new THREE.Group(), m = MAT.zinc;
    g.add(mesh(lathe([[0, 11], [1.6, 11], [2.6, 9.5], [2.6, 0], [0, 0]], 20), m));
    g.add(mesh(threadGeo(2.6, 0.5, 10.5, 2.2, 0.55, 1.6), m));
    g.add(mesh(lathe([[0, 0], [4.2, 0], [4.2, -1.4], [3, -1.6], [3, -20], [2.2, -20.5], [2.2, -21.2], [0, -21.2]], 24), m));   // collar + shank + neck
    const ball = mesh(new THREE.SphereGeometry(3.6, 20, 14), m); ball.position.y = -24; g.add(ball);
    const cap = mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.6, 20), m); cap.position.y = -27.3; g.add(cap);
    phillips(g, 3.2, -27.6);
    return shadow(g);
  },
  // B: cam lock (excenterlås) Ø15×10 — the face is flush with the panel; opening on the side catches the bolt head
  B() {
    const g = new THREE.Group(), m = MAT.zinc;
    const body = mesh(new THREE.CylinderGeometry(7.5, 7.5, 10, 32, 1, false, 0.55, Math.PI * 2 - 1.1), m); body.position.y = 5; g.add(body);
    const inner = mesh(new THREE.CylinderGeometry(4.2, 4.2, 10, 20), MAT.darkSteel); inner.position.y = 5; g.add(inner);
    const rim = mesh(new THREE.CylinderGeometry(7.6, 7.6, 0.8, 32), m); rim.position.y = 0.4; g.add(rim);
    // drive: combined cross + slot, plus an arrow showing the opening
    phillips(g, 5.5, 0); slot(g, 6.2, 0);
    const ar = mesh(new THREE.ConeGeometry(1.4, 3, 3), MAT.recess); ar.rotation.z = -Math.PI / 2; ar.position.set(5.6, -0.1, 0); ar.scale.y = 0.6; g.add(ar);
    return shadow(g);
  },
  // C: fluted beech dowel Ø6×30 (origin = centre; the instance shifts it)
  C() {
    const geo = new THREE.CylinderGeometry(3, 3, 30, 24, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x);
      let k = 1 - 0.07 * (0.5 + 0.5 * Math.cos(a * 8));       // 8 flutes
      if (Math.abs(y) > 13.5) k *= 0.82;                        // chamfered ends
      p.setX(i, x * k); p.setZ(i, z * k);
    }
    geo.computeVertexNormals();
    return shadow(mesh(geo, MAT.beech));
  },
  // D: nail glide Ø10×3
  D() {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0], [5, 0], [5, -1.6], [3.6, -3], [0, -3]], 28), MAT.greyPlastic));
    g.add(mesh(lathe([[0, 8], [0.9, 6.5], [0.9, 0], [0, 0]], 10), MAT.steel));
    return shadow(g);
  },
  // E: anti-topple bracket 75×25×15 (placed part). Local: plate in XZ along +Z, tab rising at z=0 along -Y
  E() {
    const g = new THREE.Group();
    const s = new THREE.Shape([[-7.5, 0], [7.5, 0], [7.5, 75], [-7.5, 75]].map(([x, y]) => new THREE.Vector2(x, y)));
    const sl = new THREE.Path(); sl.absarc(0, 25, 2.2, Math.PI, 0, true); sl.lineTo(2.2, 55); sl.absarc(0, 55, 2.2, 0, Math.PI, true); sl.lineTo(-2.2, 25);
    s.holes.push(sl);
    const plate = mesh(new THREE.ExtrudeGeometry(s, { depth: 2, bevelEnabled: false }), MAT.zinc);
    plate.rotation.x = Math.PI / 2; plate.position.y = 0; g.add(plate);   // plate occupies y[-2,0], z[0,75]
    const t = new THREE.Shape([[-7.5, 0], [7.5, 0], [7.5, 18], [-7.5, 18]].map(([x, y]) => new THREE.Vector2(x, y)));
    t.absarc(0, 18, 7.5, 0, Math.PI, false);
    const h = new THREE.Path(); h.absarc(0, 14, 2.6, 0, Math.PI * 2, true); t.holes.push(h);   // hole 16 mm below the plate
    const tab = mesh(new THREE.ExtrudeGeometry(t, { depth: 2, bevelEnabled: false, curveSegments: 16 }), MAT.zinc);
    tab.rotation.x = Math.PI; tab.position.set(0, -2, 0); g.add(tab);     // tab hangs down at z∈[-2,0]
    return shadow(g);
  },
  F: () => screw({ d: 4, len: 10, head: 'pan', headD: 7.6, pitch: 1.6 }),
  G: () => screw({ d: 5, len: 10, head: 'euro', headD: 10, pitch: 3, point: false, mat: MAT.brass }),
  J: () => screw({ d: 4, len: 35, head: 'csk', headD: 8, pitch: 1.8 }),
  L: () => screw({ d: 4, len: 15, head: 'pan', headD: 7, pitch: 0.7, point: false, mat: MAT.steel }),
  M: () => screw({ d: 3, len: 14, head: 'csk', headD: 6, pitch: 1.35 }),
  // H: back-panel corner clip 15×15 (placed). Wedge with screw hole; local +Y = screw axis
  H() {
    const g = new THREE.Group();
    const s = new THREE.Shape([[0, 0], [15, 0], [0, 15]].map(([x, y]) => new THREE.Vector2(x, y)));
    const w = mesh(new THREE.ExtrudeGeometry(s, { depth: 8, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 1 }), MAT.whitePlastic);
    w.rotation.y = -Math.PI / 2; w.position.set(4, -15, -7.5); g.add(w);       // occupies y∈[-15,0] (screw comes out at y=0)
    const hole = mesh(new THREE.CircleGeometry(1.8, 16), MAT.recess); hole.position.set(0, -3, 3.2); g.add(hole);
    return shadow(g);
  },
  // K: handle 103×26×11, local: grip along X, posts along +Z (away from the front), mount face at z=0
  K() {
    const g = new THREE.Group(), m = MAT.handle;
    const bar = mesh(new THREE.BoxGeometry(103, 11, 7), m); bar.position.z = 22.5; g.add(bar);
    for (const x of [-48, 48]) { const p = mesh(new THREE.BoxGeometry(7, 11, 22), m); p.position.set(x, 0, 11); g.add(p); }
    return shadow(g);
  },
  // N: black plastic block 48×12×15 with two countersunk holes (screw axis +Y)
  N() {
    const g = new THREE.Group();
    const b = mesh(new THREE.BoxGeometry(48, 15, 12), MAT.blackPlastic); b.position.y = -7.5; g.add(b);
    for (const x of [-12, 12]) { const h = mesh(new THREE.CircleGeometry(2.6, 16), MAT.recess); h.rotation.x = Math.PI / 2; h.position.set(x, -15.05, 0); g.add(h); }
    return shadow(g);
  },
};

// drawer runners, 250 mm. carcass runner (CL/CR): roller at the front (z = +125); drawer runner (DL/DR): roller at the back
function runner(kind, side) {
  const g = new THREE.Group(), m = MAT.runner, s = side === 'L' ? -1 : 1;
  if (kind === 'C') {                     // C profile, web against the side panel (local x = 0 is the panel face)
    const web = mesh(new THREE.BoxGeometry(1.4, 30, 250), m); web.position.set(-s * 0.7, 0, 0); g.add(web);
    for (const y of [-14.3, 14.3]) { const f = mesh(new THREE.BoxGeometry(11, 1.4, 250), m); f.position.set(-s * 6.2, y, 0); g.add(f); }
    const w = mesh(new THREE.CylinderGeometry(8, 8, 6, 20), MAT.nylon); w.rotation.z = Math.PI / 2; w.position.set(-s * 6.5, 2, 122); g.add(w);
    for (const z of [100, -80]) { const h = mesh(new THREE.CircleGeometry(2.6, 14), MAT.recess); h.rotation.y = -s * Math.PI / 2; h.position.set(-s * 1.5, 0, z); g.add(h); }
  } else {                                 // L profile under the drawer side; local y=0 is the side's bottom edge
    const fl = mesh(new THREE.BoxGeometry(13, 1.4, 250), m); fl.position.set(-s * 0.5, -0.7, 0); g.add(fl);
    const web = mesh(new THREE.BoxGeometry(1.4, 16, 250), m); web.position.set(s * 6.8, 6.5, 0); g.add(web);
    const w = mesh(new THREE.CylinderGeometry(8, 8, 6, 20), MAT.nylon); w.rotation.z = Math.PI / 2; w.position.set(s * 11, 2, -118); g.add(w);
  }
  return shadow(g);
}
BUILD.CL = () => runner('C', 'L'); BUILD.CR = () => runner('C', 'R');
BUILD.DL = () => runner('D', 'L'); BUILD.DR = () => runner('D', 'R');
// wall plug + wall screw (not in the box)
BUILD.PLUG = () => { const g = new THREE.Group(); g.add(mesh(lathe([[0, 0], [3.6, 0], [3.6, -1.2], [4.6, -1.2], [4.6, -2], [0, -2]], 16), MAT.greyPlastic)); const b = mesh(lathe([[3.2, 0], [3.4, 30], [2.4, 34], [0, 34], [0, 0]], 16), MAT.greyPlastic); g.add(b); return shadow(g); };
BUILD.WALLSCREW = () => screw({ d: 5, len: 75, head: 'pan', headD: 9, pitch: 2.2, mat: MAT.zinc });

export function makeHardware(type) { return BUILD[type](); }
export const HARDWARE_TYPES = Object.keys(BUILD);

// ---------- tools (tip/working point at origin, working direction +Y) ----------
export function makeTool(type) {
  const g = new THREE.Group();
  if (type === 'phillips' || type === 'flat') {
    const grip = type === 'phillips' ? MAT.phillipsGrip : MAT.flatGrip;
    // tip
    if (type === 'phillips') {
      g.add(mesh(new THREE.ConeGeometry(2.6, 7, 4).rotateX(Math.PI).translate(0, -3.5, 0), MAT.steel));
    } else {
      const bl = mesh(new THREE.BoxGeometry(6, 8, 0.9), MAT.steel); bl.position.y = -4; g.add(bl);
    }
    const shaft = mesh(new THREE.CylinderGeometry(2.6, 2.6, 110, 14), MAT.steel); shaft.position.y = -62; g.add(shaft);
    const handle = mesh(lathe([[3, 0], [9, -4], [12, -18], [12.5, -70], [11, -86], [6, -92], [0, -93]], 28), grip); handle.position.y = -117; g.add(handle);
    for (let i = 0; i < 6; i++) {   // rubber grip strips so the rotation reads clearly
      const st = mesh(new THREE.BoxGeometry(3, 52, 2.4), MAT.rubberBlack); const a = i / 6 * Math.PI * 2;
      st.position.set(Math.cos(a) * 12.2, -162, Math.sin(a) * 12.2); st.rotation.y = -a; g.add(st);
    }
    // marker on the end cap: + or −
    const cap = new THREE.Group(); cap.position.y = -210.2;
    const m1 = mesh(new THREE.BoxGeometry(10, 0.5, 2.4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); cap.add(m1);
    if (type === 'phillips') { const m2 = m1.clone(); m2.rotation.y = Math.PI / 2; cap.add(m2); }
    g.add(cap);
  } else if (type === 'hammer') {
    // striking face at origin facing +Y; head along Y, handle along +X
    const head = mesh(new THREE.CylinderGeometry(13, 13, 95, 20), MAT.darkSteel); head.position.y = -47.5; g.add(head);
    const face = mesh(new THREE.CylinderGeometry(13.5, 13.5, 4, 20), MAT.steel); face.position.y = -2; g.add(face);
    const handle = mesh(new THREE.CylinderGeometry(9, 12, 300, 16), MAT.ash); handle.rotation.z = Math.PI / 2; handle.position.set(160, -40, 0); g.add(handle);
    const end = mesh(new THREE.SphereGeometry(11, 14, 10), MAT.rubberBlack); end.position.set(312, -40, 0); g.add(end);
  } else if (type === 'tape') {
    // case at origin, blade extends along +X (scaled by userData.setLength)
    const cs = mesh(new THREE.BoxGeometry(62, 62, 30), MAT.tapeYellow); cs.position.set(-31, 31, 0); g.add(cs);
    const ring = mesh(new THREE.TorusGeometry(18, 4, 10, 24), MAT.rubberBlack); ring.position.set(-31, 31, 15.5); g.add(ring);
    const blade = mesh(new THREE.BoxGeometry(1, 0.6, 19), MAT.tapeBlade); blade.position.set(0.5, 1, 0); g.add(blade);
    const hook = mesh(new THREE.BoxGeometry(1.4, 8, 19), MAT.steel); hook.position.set(1, -3, 0); g.add(hook);
    g.userData.setLength = L => { blade.scale.x = Math.max(1, L); blade.position.x = L / 2; hook.position.x = L; };
  } else if (type === 'pencil') {
    const body = mesh(new THREE.CylinderGeometry(3.6, 3.6, 150, 6), MAT.pencil); body.position.y = -97; g.add(body);
    const cone = mesh(new THREE.ConeGeometry(3.6, 18, 6).rotateX(Math.PI), MAT.beech); cone.position.y = -13; g.add(cone);
    const lead = mesh(new THREE.ConeGeometry(1, 5, 8).rotateX(Math.PI), MAT.graphite); lead.position.y = -2.5; g.add(lead);
  } else if (type === 'drill') {
    const bit = mesh(new THREE.CylinderGeometry(3, 3, 70, 10), MAT.steel); bit.position.y = -35; g.add(bit);
    const chuck = mesh(lathe([[0, 0], [8, 0], [14, -30], [14, -42], [0, -42]], 20), MAT.darkSteel); chuck.position.y = -70; g.add(chuck);
    const body = mesh(new THREE.CylinderGeometry(30, 30, 150, 20), MAT.drillBody); body.position.y = -187; g.add(body);
    const grip = mesh(new THREE.BoxGeometry(40, 32, 130), MAT.rubberBlack); grip.position.set(0, -215, 85); g.add(grip);
    const bat = mesh(new THREE.BoxGeometry(70, 60, 45), MAT.rubberBlack); bat.position.set(0, -215, 170); g.add(bat);
    g.userData.spin = bit;
  }
  return shadow(g);
}
export const TOOL_TYPES = ['phillips', 'flat', 'hammer', 'tape', 'pencil', 'drill'];

// circular arrow that shows the turning direction (clockwise seen from the screw head = +rotation about +Y)
export function makeTurnArrow(radius = 14, color = '#1b3d84') {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true });
  const arc = mesh(new THREE.TorusGeometry(radius, radius * 0.09, 6, 40, Math.PI * 1.5), m);
  arc.rotation.x = Math.PI / 2; g.add(arc);
  // the arc runs (cos a, 0, sin a) for a ∈ [0, 1.5π]; tightening (+rotation about +Y) moves toward -Z,
  // so the head sits at a = 0 and points along -Z
  const head = mesh(new THREE.ConeGeometry(radius * 0.25, radius * 0.5, 12), m);
  head.rotation.x = -Math.PI / 2; head.position.set(radius, 0, -radius * 0.2);
  g.add(head);
  g.renderOrder = 20; g.traverse(o => o.renderOrder = 20);
  return g;
}
