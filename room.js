// Herskabsrum som baggrund til samlevejledninger. Alle mål i mm, gulv i y = 0.
// Brug: const room = buildRoom(THREE, scene, renderer); kald room.update(camera) hver frame.
// Rummet er procedurelt (ingen billedfiler) og kan genbruges til alle manualer.

export const ROOM = {
  x0: -3000, x1: 3000,      // venstre / højre væg
  z0: -2200, z1: 3000,      // bagvæg (med vindue) / forvæg
  height: 3200,             // klassisk herskabslofthøjde
  window: { x0: -1000, x1: 1000, y0: 450, y1: 2850, depth: 300 },
};

// deterministic random so the room looks the same every time
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

// ---------- textures ----------
function herringboneTexture(THREE, renderer) {
  const W = 70, L = 420, TILE = 12 * W;           // 70 × 420 mm planks; pattern repeats every 840 mm
  const px = 2048, s = px / TILE;
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d');
  const shades = Array.from({ length: 24 }, (_, i) => {
    const r = rng(i * 97 + 13); r();
    const l = 70 + r() * 9, h = 34 + r() * 6, sat = 42 + r() * 12;
    return { base: `hsl(${h} ${sat}% ${l}%)`, seed: i * 31 + 7 };
  });
  function plank(x, y, w, h, id) {
    const sh = shades[id], r = rng(sh.seed);
    g.save(); g.beginPath(); g.rect(x * s, y * s, w * s, h * s); g.clip();
    g.fillStyle = sh.base; g.fillRect(x * s, y * s, w * s, h * s);
    const along = w > h;                           // grain follows the long side
    for (let i = 0; i < 26; i++) {
      const t = r(), a = 0.03 + r() * 0.08;
      g.strokeStyle = r() < 0.5 ? `rgba(120,80,40,${a})` : `rgba(255,240,215,${a})`;
      g.lineWidth = 0.6 + r() * 2.2; g.beginPath();
      if (along) { const yy = (y + t * h) * s; g.moveTo(x * s, yy); g.bezierCurveTo((x + w * .3) * s, yy + (r() - .5) * 6, (x + w * .7) * s, yy + (r() - .5) * 6, (x + w) * s, yy + (r() - .5) * 4); }
      else { const xx = (x + t * w) * s; g.moveTo(xx, y * s); g.bezierCurveTo(xx + (r() - .5) * 6, (y + h * .3) * s, xx + (r() - .5) * 6, (y + h * .7) * s, xx + (r() - .5) * 4, (y + h) * s); }
      g.stroke();
    }
    g.restore();
    g.strokeStyle = 'rgba(70,45,20,0.45)'; g.lineWidth = 2;   // seam between planks
    g.strokeRect(x * s + 1, y * s + 1, w * s - 2, h * s - 2);
  }
  // herringbone: horizontal plank H_k = [kW, kW+L] × [kW, kW+W], vertical V_k beside it; bands repeat every 2L in y
  const mod = (a, n) => ((a % n) + n) % n;
  for (let j = -3; j <= 3; j++) for (let k = -12; k <= 24; k++) {
    const id = mod(k + 12 * j, 12);
    plank(k * W, k * W + j * 2 * L, L, W, id);
    plank(k * W + L, k * W + W - L + j * 2 * L, W, L, 12 + id);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { texture: t, tile: TILE };
}

function gardenTexture(THREE) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
  const g = c.getContext('2d'), r = rng(5);
  const sky = g.createLinearGradient(0, 0, 0, 640);
  sky.addColorStop(0, '#dfe8ee'); sky.addColorStop(0.45, '#f6f3ea'); sky.addColorStop(1, '#ebe4d4');
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 640);
  g.filter = 'blur(28px)';
  for (let i = 0; i < 40; i++) {                   // soft out-of-focus garden, like the product photo
    g.fillStyle = ['#8fa77a', '#b5c39a', '#7b9468', '#c9cfae'][i % 4];
    g.globalAlpha = 0.55; g.beginPath();
    g.ellipse(r() * 1024, 330 + r() * 200, 60 + r() * 140, 50 + r() * 110, 0, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 0.8; g.fillStyle = '#d8cdb8'; g.fillRect(-50, 560, 1124, 120);   // gravel path
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function leafTexture(THREE, hue) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, `hsl(${hue} 52% 22%)`); grad.addColorStop(0.5, `hsl(${hue} 50% 32%)`); grad.addColorStop(1, `hsl(${hue} 52% 22%)`);
  g.fillStyle = grad; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = `hsl(${hue - 10} 45% 62%)`; g.lineWidth = 7;
  g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 512); g.stroke();        // midrib
  g.lineWidth = 3; g.globalAlpha = 0.55;
  for (let y = 40; y < 480; y += 46) for (const sgn of [-1, 1]) {           // lateral veins
    g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + sgn * 70, y + 40, 128 + sgn * 125, y + 95); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rugTexture(THREE) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 720;
  const g = c.getContext('2d'), r = rng(11);
  g.fillStyle = '#efe9de'; g.fillRect(0, 0, 1024, 720);
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.25)' : 'rgba(150,130,100,.10)'; g.fillRect(r() * 1024, r() * 720, 2, 2); }
  g.strokeStyle = '#d9cfbe'; g.lineWidth = 10; g.strokeRect(40, 40, 944, 640);
  g.lineWidth = 3; g.strokeRect(62, 62, 900, 596);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- build ----------
export function buildRoom(THREE, scene, renderer, opts = {}) {
  const R = { ...ROOM, ...opts };
  const root = new THREE.Group(); root.name = 'room'; scene.add(root);
  const W = R.x1 - R.x0, D = R.z1 - R.z0, H = R.height;

  const paint = new THREE.MeshStandardMaterial({ color: '#f4f2ed', roughness: 0.92 });
  const trim = new THREE.MeshStandardMaterial({ color: '#f7f5f0', roughness: 0.6 });
  paint.shadowSide = THREE.DoubleSide;

  const shadowed = o => { o.castShadow = o.receiveShadow = true; return o; };
  const box = (w, h, d, m, x, y, z) => { const o = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)); o.position.set(x, y, z); return o; };

  // floor: herringbone, laid at 45° to the walls
  const hb = herringboneTexture(THREE, renderer);
  const floorGeo = new THREE.PlaneGeometry(W, D); floorGeo.rotateX(-Math.PI / 2);
  floorGeo.translate((R.x0 + R.x1) / 2, 0, (R.z0 + R.z1) / 2);
  const p = floorGeo.attributes.position, uv = floorGeo.attributes.uv, c45 = Math.SQRT1_2;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) * c45 - p.getZ(i) * c45) / hb.tile, (p.getX(i) * c45 + p.getZ(i) * c45) / hb.tile);
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ map: hb.texture, roughness: 0.5, metalness: 0 }));
  floor.receiveShadow = true; floor.name = 'floor'; root.add(floor);

  // rug under the work area (manual: assemble on a soft surface); 1 mm so parts still stand at y = 0
  const rg = { w: 2200, d: 1550, x: -250, z: 150, ...(opts.rug || {}) };
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(rg.w, rg.d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: rugTexture(THREE), roughness: 1 }));
  rug.position.set(rg.x, 1, rg.z); rug.receiveShadow = true; root.add(rug);

  // ---- walls: each in local coords, x along the wall, y up, +z into the room ----
  const walls = [];
  function wall(len, hole) {
    const g = new THREE.Group();
    const shape = new THREE.Shape([new THREE.Vector2(-len / 2, 0), new THREE.Vector2(len / 2, 0), new THREE.Vector2(len / 2, H), new THREE.Vector2(-len / 2, H)]);
    if (hole) shape.holes.push(new THREE.Path([new THREE.Vector2(hole.x0, hole.y0), new THREE.Vector2(hole.x0, hole.y1), new THREE.Vector2(hole.x1, hole.y1), new THREE.Vector2(hole.x1, hole.y0)]));
    g.add(shadowed(new THREE.Mesh(new THREE.ShapeGeometry(shape), paint)));
    // skirting, chair rail, crown molding (stuk)
    g.add(box(len, 220, 22, trim, 0, 110, 11), box(len, 18, 32, trim, 0, 226, 16));
    g.add(box(len, 60, 26, trim, 0, 930, 13));
    g.add(box(len, 70, 40, trim, 0, H - 35, 20), box(len, 40, 80, trim, 0, H - 95, 40), box(len, 30, 110, trim, 0, H - 20, 55));
    // raised panel frames below and above the chair rail, skipping the window
    const free = [[-len / 2 + 120, len / 2 - 120]];
    if (hole) { free.length = 0; free.push([-len / 2 + 120, hole.x0 - 160], [hole.x1 + 160, len / 2 - 120]); }
    for (const [a, b] of free) {
      const gap = 110, n = Math.max(1, Math.round((b - a - gap) / (850 + gap))), fw = (b - a - (n + 1) * gap) / n;
      for (let i = 0; i < n; i++) {
        const fx0 = a + gap + i * (fw + gap);
        for (const [y0, y1] of [[330, 830], [1060, 2800]]) frame(g, fx0, y0, fx0 + fw, y1);
      }
    }
    walls.push(g); root.add(g);
    return g;
  }
  function frame(g, x0, y0, x1, y1, t = 42, d = 16) {
    g.add(box(x1 - x0, t, d, trim, (x0 + x1) / 2, y0 + t / 2, d / 2), box(x1 - x0, t, d, trim, (x0 + x1) / 2, y1 - t / 2, d / 2));
    g.add(box(t, y1 - y0 - 2 * t, d, trim, x0 + t / 2, (y0 + y1) / 2, d / 2), box(t, y1 - y0 - 2 * t, d, trim, x1 - t / 2, (y0 + y1) / 2, d / 2));
  }

  const win = R.window;
  const back = wall(W, win); back.position.set((R.x0 + R.x1) / 2, 0, R.z0);
  const front = wall(W); front.position.set((R.x0 + R.x1) / 2, 0, R.z1); front.rotation.y = Math.PI;
  const left = wall(D); left.position.set(R.x0, 0, (R.z0 + R.z1) / 2); left.rotation.y = Math.PI / 2;
  const right = wall(D); right.position.set(R.x1, 0, (R.z0 + R.z1) / 2); right.rotation.y = -Math.PI / 2;

  // ---- window in the back wall (local coords of `back`) ----
  const wd = win.depth, ww = win.x1 - win.x0, wh = win.y1 - win.y0, wcx = (win.x0 + win.x1) / 2;
  back.add(box(20, wh, wd, paint, win.x0 - 10, (win.y0 + win.y1) / 2, -wd / 2), box(20, wh, wd, paint, win.x1 + 10, (win.y0 + win.y1) / 2, -wd / 2));
  back.add(box(ww + 40, 20, wd, paint, wcx, win.y1 + 10, -wd / 2));
  back.add(box(ww + 160, 45, wd + 60, trim, wcx, win.y0 - 22, -wd / 2 + 30));          // sill
  // architrave around the opening
  back.add(box(90, wh + 90, 22, trim, win.x0 - 45, (win.y0 + win.y1 + 90) / 2, 11), box(90, wh + 90, 22, trim, win.x1 + 45, (win.y0 + win.y1 + 90) / 2, 11));
  back.add(box(ww + 180, 90, 22, trim, wcx, win.y1 + 45, 11));
  // frame, centre post, transom and glazing bars (sprosser): two casements with three panes, two top lights
  const fz = -wd / 2, frameMat = trim, transomY = win.y1 - 620;
  const bar = (w, h, x, y, d = 70) => back.add(box(w, h, d, frameMat, x, y, fz));
  bar(80, wh, win.x0 + 40, (win.y0 + win.y1) / 2); bar(80, wh, win.x1 - 40, (win.y0 + win.y1) / 2);
  bar(ww, 80, wcx, win.y0 + 40); bar(ww, 80, wcx, win.y1 - 40); bar(ww, 80, wcx, transomY);
  bar(90, wh, wcx, (win.y0 + win.y1) / 2);
  for (const t of [1 / 3, 2 / 3]) bar(ww, 34, wcx, win.y0 + 80 + t * (transomY - win.y0 - 80), 45);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.07, depthWrite: false }));
  glass.position.set(wcx, (win.y0 + win.y1) / 2, fz - 10); back.add(glass);
  // garden behind the window (unlit, so it reads as bright daylight)
  const garden = new THREE.Mesh(new THREE.PlaneGeometry(9000, 5600), new THREE.MeshBasicMaterial({ map: gardenTexture(THREE), toneMapped: false }));
  garden.position.set(wcx, 1500, -2600); back.add(garden);
  // linen curtains and a brass rod
  const linen = new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  for (const s of [-1, 1]) {
    const cg = new THREE.PlaneGeometry(720, win.y1 + 180, 48, 1), cp = cg.attributes.position;
    for (let i = 0; i < cp.count; i++) cp.setZ(i, 35 * Math.sin(cp.getX(i) / 720 * Math.PI * 14));
    cg.computeVertexNormals();
    const cur = new THREE.Mesh(cg, linen); cur.receiveShadow = true;
    cur.position.set(wcx + s * (ww / 2 + 330), (win.y1 + 180) / 2 + 8, 90); back.add(cur);
  }
  const brass = new THREE.MeshStandardMaterial({ color: '#b89a5e', metalness: 0.9, roughness: 0.35 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, ww + 1700, 16).rotateZ(Math.PI / 2), brass);
  rod.position.set(wcx, win.y1 + 200, 90); back.add(rod);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(30, 16, 12), brass); f.position.set(wcx + s * (ww / 2 + 850), win.y1 + 200, 90); back.add(f); }

  // ceiling with a plaster rosette
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(Math.PI / 2), paint);
  ceiling.position.set((R.x0 + R.x1) / 2, H, (R.z0 + R.z1) / 2); root.add(ceiling);
  const ros = new THREE.Mesh(new THREE.LatheGeometry([0, 1, 2, 3, 4, 5].map(i => new THREE.Vector2(60 + i * 60, -18 * Math.abs(Math.sin(i * 1.3)) - (5 - i) * 6)), 48), trim);
  ros.position.set(0, H, 400); root.add(ros);

  // ---- plant: tall fiddle-leaf fig (Ficus lyrata) in a glazed pot ----
  const plant = buildPlant(THREE); plant.position.set(...(opts.plantAt || [-1850, 0, -1450])); root.add(plant);

  // ---- light: daylight only enters through the window ----
  const hemi = new THREE.HemisphereLight('#fbf8f2', '#d9c6a8', 1.25); root.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1dc', 4.2);
  sun.position.set(-900, 2600, -4800); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -3800, right: 3800, top: 3800, bottom: -3800, near: 500, far: 12000 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 1.5;
  root.add(sun, sun.target);
  // soft bounce from the window into the room (no shadows)
  const fill = new THREE.DirectionalLight('#fff8ee', 0.7); fill.position.set(wcx + 1500, 2200, R.z1); root.add(fill);  // bounce light from the room, no shadows

  // hide walls/ceiling the camera is behind, so the room never blocks the view
  const _v = new THREE.Vector3();
  function update(camera) {
    for (const w of walls) { w.worldToLocal(_v.copy(camera.position)); w.visible = _v.z > 0; }
    ceiling.visible = ros.visible = camera.position.y < H;
  }
  return { root, update, sun, floor };
}

function buildPlant(THREE) {
  const g = new THREE.Group(); g.name = 'plant';
  const r = rng(42);
  // pot (lathe profile, mm): glazed off-white ceramic, 520 mm across, 480 mm high
  const prof = [[0, 0], [190, 0], [215, 30], [245, 250], [262, 440], [268, 470], [255, 480], [240, 470]].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshStandardMaterial({ color: '#e9e3d6', roughness: 0.35 }));
  pot.castShadow = pot.receiveShadow = true; g.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(240, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3b2c22', roughness: 1 }));
  soil.position.y = 450; g.add(soil);

  const bark = new THREE.MeshStandardMaterial({ color: '#6b5a48', roughness: 0.9 });
  const leafMats = [118, 112, 124].map(h => new THREE.MeshStandardMaterial({ map: leafTexture(THREE, h), roughness: 0.42, side: THREE.DoubleSide }));
  const leafGeos = [0.25, 0.4, 0.55].map(droop => leafGeometry(THREE, droop));
  const trunks = [
    { base: [-40, 450, 10], top: [-140, 2050, 60], lean: [-60, 0, 40] },
    { base: [40, 450, -20], top: [180, 1750, -90], lean: [80, 0, -30] },
    { base: [10, 450, 50], top: [30, 1450, 220], lean: [0, 0, 110] },
  ];
  for (const t of trunks) {
    const a = new THREE.Vector3(...t.base), b = new THREE.Vector3(...t.top);
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(...t.lean));
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 13, 8), bark); trunk.castShadow = true; g.add(trunk);
    const n = 15;
    for (let i = 0; i < n; i++) {
      const u = 0.38 + 0.62 * (i / (n - 1));
      const at = curve.getPoint(u);
      const az = i * 2.39996 + r() * 0.4;                           // golden-angle spiral
      const elev = THREE.MathUtils.lerp(0.15, 0.95, u) + (r() - 0.5) * 0.25;
      const dir = new THREE.Vector3(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev)).normalize();
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const normal = new THREE.Vector3().crossVectors(side, dir).normalize();
      const leaf = new THREE.Mesh(leafGeos[i % 3], leafMats[(i + Math.round(u * 3)) % 3]);
      leaf.matrixAutoUpdate = false;
      const size = THREE.MathUtils.lerp(330, 240, u) * (0.85 + r() * 0.3);
      leaf.matrix.makeBasis(side, dir, normal).scale(new THREE.Vector3(size, size, size)).setPosition(at.addScaledVector(dir, 25));
      leaf.castShadow = true; g.add(leaf);
    }
  }
  return g;
}

// unit-length fiddle-shaped leaf along +y, face normal +z; cupped across and drooping at the tip
function leafGeometry(THREE, droop) {
  const nu = 16, nv = 8, pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    const w = 0.36 * Math.pow(Math.sin(Math.PI * Math.min(u * 1.02, 1)), 0.75) * (0.6 + 0.55 * u) * (1 - 0.1 * Math.exp(-(((u - 0.42) / 0.09) ** 2)));
    for (let j = 0; j <= nv; j++) {
      const v = j / nv * 2 - 1;
      pos.push(v * w, u, 0.12 * v * v * w - droop * u * u * 0.35);
      uv.push(v * 0.5 + 0.5, u);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + nv + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
