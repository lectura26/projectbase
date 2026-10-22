// Generisk afspiller for samlevejledninger: bygger scenen ud fra en model (dele, beslag, grupper, trin)
// og beregner hele tilstanden deterministisk for (trin, fremdrift), så man kan spole frit.

import * as THREE from 'three';
import { makeHardware, makeTool, makeTurnArrow, MAT } from './hardware.js';

const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = t => Math.min(1, Math.max(0, t));
const seg = (u, a, b) => clamp01((u - a) / (b - a));
const UP = new THREE.Vector3(0, 1, 0);

// per type: how far the item travels into the hole, thread pitch, where the tool engages (local y), hole radius
const HW = {
  A: { travel: 11, pitch: 2.2, head: -27.9, hole: 2.6, mateHole: 4 },
  B: { travel: 10, head: 0, hole: 7.5, hand: true },
  C: { travel: 20, head: 0, hole: 3, mateHole: 3 },
  D: { travel: 8, head: -3, hole: 1 },
  F: { travel: 10, pitch: 1.6, head: -2.7, hole: 1.4 },
  G: { travel: 10, pitch: 3, head: -3.1, hole: 1.6 },
  J: { travel: 35, pitch: 1.8, head: -2.8, hole: 2, mateHole: 1.6 },
  L: { travel: 15, pitch: 0.7, head: -2.5, hole: 2 },
  M: { travel: 14, pitch: 1.35, head: -2.1, hole: 1.2 },
  PLUG: { travel: 34, head: -2, hole: 0 },
  WALLSCREW: { travel: 75, pitch: 2.2, head: -3.2, hole: 0 },
};

export function createPlayer({ scene, camera, controls, model, manual }) {
  const { parts, hardware, groups, steps } = model;
  const P = Object.fromEntries(parts.map(p => [p.id, p]));
  const H = Object.fromEntries(hardware.map(h => [h.id, h]));

  // ---------- materials ----------
  const PO = { polygonOffset: true, polygonOffsetFactor: 0.5, polygonOffsetUnits: 1 };   // faces sit a hair behind their edge lines
  const melamine = new THREE.MeshStandardMaterial({ color: '#f3f3f0', roughness: 0.55, ...PO });
  const edge = new THREE.MeshStandardMaterial({ color: '#cfd0ca', roughness: 0.7, ...PO });
  const hardboard = new THREE.MeshStandardMaterial({ color: '#b08a60', roughness: 0.9, ...PO });
  const holeMat = new THREE.MeshBasicMaterial({ color: '#5d626b', polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -2 });
  const grooveMat = new THREE.MeshBasicMaterial({ color: '#8a8f97', polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -2 });
  const lineMat = new THREE.LineBasicMaterial({ color: '#4f5661', transparent: true, opacity: 0.85 });
  const cast = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  const holes = [];   // filled while the hardware is created (see addHole)

  // ---------- groups (only hold group-hosted hardware) ----------
  const G = {};
  for (const [id, g] of Object.entries(groups)) {
    const o = new THREE.Group(); o.matrixAutoUpdate = false; o.name = id; scene.add(o);
    G[id] = { ...g, id, obj: o, M: g.poses[g.start].clone() };
  }

  // ---------- panels ----------
  for (const p of parts) {
    const o = new THREE.Group(); o.matrixAutoUpdate = false; o.name = 'part' + p.id; scene.add(o);
    const s = p.size, thin = s.x <= s.y && s.x <= s.z ? 0 : s.y <= s.z ? 1 : 2;
    const hard = s.getComponent(thin) <= 3.01;
    let geo;
    if (p.notch) {   // back panel with notch at the top centre
      const w = s.x / 2, h = s.y / 2, n = p.notch;
      const sh = new THREE.Shape([[-w, -h], [w, -h], [w, h], [n.w / 2, h], [n.w / 2, h - n.h], [-n.w / 2, h - n.h], [-n.w / 2, h], [-w, h]].map(([x, y]) => new THREE.Vector2(x, y)));
      geo = new THREE.ExtrudeGeometry(sh, { depth: s.z, bevelEnabled: false }); geo.translate(0, 0, -s.z / 2);
      // ExtrudeGeometry has one group for both caps; split it so the back (−z) cap is raw hardboard (one face per plane, no overlay)
      const nz = geo.attributes.normal, caps = geo.groups.find(g => g.materialIndex === 0), side = geo.groups.find(g => g.materialIndex === 1);
      const nonIdx = !geo.index;
      geo.clearGroups();
      const fr = [], bk = [];
      for (let t = caps.start; t < caps.start + caps.count; t += 3) (nz.getZ(nonIdx ? t : geo.index.getX(t)) > 0 ? fr : bk).push(t);
      // ExtrudeGeometry is non-indexed: reorder the cap vertices so each face is contiguous
      const pos = geo.attributes.position, uv = geo.attributes.uv, nrm = geo.attributes.normal;
      const copy = (src) => src.array.slice();
      const P0 = copy(pos), U0 = copy(uv), N0 = copy(nrm);
      let wi = caps.start;
      for (const list of [fr, bk]) for (const t of list) for (let k = 0; k < 3; k++, wi++) {
        for (let c = 0; c < 3; c++) { pos.array[wi * 3 + c] = P0[(t + k) * 3 + c]; nrm.array[wi * 3 + c] = N0[(t + k) * 3 + c]; }
        for (let c = 0; c < 2; c++) uv.array[wi * 2 + c] = U0[(t + k) * 2 + c];
      }
      geo.addGroup(caps.start, fr.length * 3, 0); geo.addGroup(caps.start + fr.length * 3, bk.length * 3, 2); geo.addGroup(side.start, side.count, 1);
      o.add(new THREE.Mesh(geo, [melamine, edge, hardboard]));
    } else {
      geo = new THREE.BoxGeometry(s.x, s.y, s.z);
      const mats = [0, 1, 2, 3, 4, 5].map(f => Math.floor(f / 2) === thin ? melamine : edge);
      if (hard) mats[thin * 2 + 1] = hardboard;      // raw hardboard on the underside / back
      o.add(new THREE.Mesh(geo, mats));
    }
    o.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), lineMat));
    if (p.foldLine) { const l = new THREE.Mesh(new THREE.PlaneGeometry(s.x, 1.2), grooveMat); l.position.z = s.z / 2 + 0.05; o.add(l); }
    // grooves (rille): a thin dark strip on the face, so the panel's orientation can be read like on the drawing
    for (const g of p.grooves || []) {
      const ax = 'xyz'.indexOf(g.face[1]), sign = g.face[0] === '+' ? 1 : -1, al = 'xyz'.indexOf(g.along), at = 'xyz'.indexOf(g.axis);
      const n = new THREE.Vector3().setComponent(ax, sign);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), grooveMat);
      const u = new THREE.Vector3().setComponent(al, 1), v = new THREE.Vector3().crossVectors(n, u);
      strip.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, v, n));
      strip.scale.set(s.getComponent(al), 3.2, 1);
      strip.position.setComponent(ax, sign * (s.getComponent(ax) / 2 + 0.05)).setComponent(at, g.at);
      o.add(strip);
    }
    cast(o);
    p.obj = o; p.grp = G[p.group];
    // attached from the start when the layout frame is the group's start pose
    p.startAttached = p.layout.frame && p.layout.frame === groups[p.group].poses[groups[p.group].start];
  }

  // ---------- hardware ----------
  const protos = {};
  const proto = t => protos[t] || (protos[t] = makeHardware(t));
  const _q = new THREE.Quaternion();
  for (const h of hardware) {
    const host = h.host === 'world' ? null : P[h.host] || null;
    const hostGroup = h.host !== 'world' && !P[h.host] ? G[h.host] : null;
    // host-local position: for panels subtract the panel centre (panel axes = group axes)
    h.p = host ? h.gp.clone().sub(host.center) : h.gp.clone();
    h.d = h.gd.clone();
    const holder = new THREE.Group(); holder.userData.hw = true;
    const m = proto(h.type).clone(); holder.add(m);
    if (h.type === 'C') m.position.y = (h.depth ?? 15) - 15;      // dowel: depth into host, rest sticks out
    (host ? host.obj : hostGroup ? hostGroup.obj : scene).add(holder);
    h.obj = holder; h.model = m; h.hostPart = host; h.hostGroup = hostGroup;
    // base orientation: placed items use their basis; inserted items align +Y with d (optionally rolled)
    if (h.placed) h.q0 = new THREE.Quaternion().setFromRotationMatrix(h.q);
    else if (h.roll) {
      const y = h.d.clone().normalize(), z = h.roll.clone().sub(y.clone().multiplyScalar(h.roll.dot(y))).normalize();
      h.q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(y, z), y, z));
    } else h.q0 = new THREE.Quaternion().setFromUnitVectors(UP, h.d.clone().normalize());
    h.spec = HW[h.type] || { travel: 0, head: 0, hole: 0 };
    // holes: entry hole on the host panel, and the matching hole in the mating panel
    if (host && h.spec.hole && !h.placed) {
      // the hole is where the screw's axis enters the panel (a screw may first pass through a fitting)
      const ray = new THREE.Ray(h.gp.clone().addScaledVector(h.gd, -60), h.gd.clone());
      const box = new THREE.Box3(host.center.clone().sub(host.size.clone().multiplyScalar(0.5)), host.center.clone().add(host.size.clone().multiplyScalar(0.5)));
      const at = ray.intersectBox(box, new THREE.Vector3()) || h.gp.clone();
      addHole(host, at, h.gd.clone().negate(), h.spec.hole, h, 'entry');
    }
    if (h.mate && P[h.mate.part]) {
      const mp = P[h.mate.part], back = h.mate.back;
      addHole(mp, h.gp.clone().addScaledVector(h.gd, -back), h.gd.clone().multiplyScalar(back >= 0 ? 1 : -1), h.spec.mateHole || h.spec.hole, h, 'mate');
    }
  }
  // every drilled hole as data: panel, position in the panel's own frame (mm from its centre), facing, radius, what goes in it
  function addHole(part, gp, normal, r, h, kind) {
    holes.push({ part: part.id, num: part.num, kind, type: h.type, item: h.id, local: gp.clone().sub(part.center).toArray().map(v => +v.toFixed(2)), normal: normal.clone().normalize().toArray().map(v => +v.toFixed(3)), r, size: part.size.toArray() });
    const d = new THREE.Mesh(new THREE.CircleGeometry(r, 18), holeMat);
    d.position.copy(gp).sub(part.center).addScaledVector(normal, 0.25);
    d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
    part.obj.add(d);
  }

  // ---------- tools, arrows, marks ----------
  const tools = {};
  for (const t of ['phillips', 'flat', 'hammer', 'tape', 'pencil', 'drill']) { tools[t] = makeTool(t); tools[t].visible = false; scene.add(tools[t]); }
  const arrow = makeTurnArrow(13); arrow.visible = false; scene.add(arrow);
  const turnLabel = makeLabel('Drej med uret'); turnLabel.scale.set(110, 24, 1); turnLabel.visible = false; scene.add(turnLabel);
  const measureLabel = makeLabel('', '#1b3d84'); measureLabel.visible = false; scene.add(measureLabel);
  const marks = [];   // pencil marks / drilled holes, shown from a given point in the timeline
  const stepLabels = [];

  function makeLabel(text, bg = '#1b3d84') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 112;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.renderOrder = 30; s.userData.set = (t) => {
      const g = c.getContext('2d'); g.clearRect(0, 0, 512, 112); g.font = '600 46px Figtree, system-ui, sans-serif';
      const w = Math.min(500, g.measureText(t).width + 48); g.fillStyle = bg; g.beginPath(); g.roundRect((512 - w) / 2, 8, w, 96, 48); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 256, 58); tex.needsUpdate = true;
    };
    s.userData.set(text); s.scale.set(160, 35, 1); return s;
  }

  // ---------- timeline ----------
  // slow enough to follow: every motion ×1.6, a short pause between actions, and an intro that shows what to find
  const SLOW = 1.6, GAP = 0.45, INTRO = 3.8;
  const TIMES = Object.fromEntries(Object.entries({ insertTool: 1.15, insertHand: 0.55, hammer: 1.0, cam: 0.9, place: 0.9, move: 2.6, group: 2.4, measure: 2.2, mark: 1.6, drill: 2.4, tighten: 0.9 }).map(([k, v]) => [k, v * SLOW]));
  for (const st of steps) {
    let t = st.actions.length ? INTRO : 0;
    st.intro = t;
    for (const a of st.actions) {
      const n = a.items ? a.items.length : a.lanes ? Math.max(...a.lanes.map(l => l.length)) : 1;
      let per = a.per;
      if (!per) per = a.type === 'insert' ? (a.tool === 'hammer' ? TIMES.hammer : a.tool ? TIMES.insertTool : TIMES.insertHand)
        : a.type === 'cam' ? TIMES.cam : a.type === 'place' ? TIMES.place : a.type === 'tighten' ? TIMES.tighten : 0;
      else per *= SLOW;
      a.per = per; a.n = n;
      const seqItems = a.tool || a.type === 'cam' || a.type === 'tighten';
      a.dur = a.dur ? a.dur * SLOW : (per ? (seqItems ? per * n : per + 0.3 * (n - 1)) : TIMES[a.type] || 2 * SLOW);
      a.stagger = seqItems ? per : 0.3;
      a.t0 = t; t += a.dur; a.t1 = t; t += GAP;
    }
    st.dur = Math.max(1.5, t);
    // what to fetch: panels that move in this step and the panels that receive hardware
    const find = new Set();
    for (const a of st.actions) {
      if (a.type === 'move') (a.lanes ? a.lanes.flat() : a.parts).forEach(id => find.add(id));
      if (a.type !== 'move') for (const id of a.items || (a.lanes ? a.lanes.flat() : [])) { const h = H[id]; if (h && P[h.host]) find.add(h.host); }
    }
    st.find = find.size ? [...find] : st.focus.slice();
  }

  // ---------- state evaluation ----------
  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3();
  let toolUse = null, focus = null;

  function groupWorld(id) { return G[id].M; }
  function partWorld(p) {
    if (p.state.mode === 'group') return groupWorld(p.group).clone().multiply(new THREE.Matrix4().makeTranslation(p.center.x, p.center.y, p.center.z));
    return p.state.M.clone();
  }
  function lerpMatrix(A, B, u) {
    const pa = new THREE.Vector3(), qa = new THREE.Quaternion(), sa = new THREE.Vector3();
    const pb = new THREE.Vector3(), qb = new THREE.Quaternion(), sb = new THREE.Vector3();
    A.decompose(pa, qa, sa); B.decompose(pb, qb, sb);
    return new THREE.Matrix4().compose(pa.lerp(pb, u), qa.slerp(qb, u), sa.lerp(sb, u));
  }
  function snapToFloor(gid, floorY) {
    const ps = parts.filter(p => p.group === gid && p.state.mode === 'group');
    if (!ps.length) return;
    let min = Infinity;
    for (const p of ps) {
      const W = partWorld(p), h = p.size.clone().multiplyScalar(0.5);
      for (let i = 0; i < 8; i++) { tmpV.set(i & 1 ? h.x : -h.x, i & 2 ? h.y : -h.y, i & 4 ? h.z : -h.z).applyMatrix4(W); min = Math.min(min, tmpV.y); }
    }
    G[gid].M.premultiply(new THREE.Matrix4().makeTranslation(0, floorY - min, 0));
  }
  // lowest panel point above the floor in each resting pose (glides / runners carry the rest)
  const FLOOR = { lying: 0, upright: 3, wall: 3, away: 3, down: 0, flip: 0, up: 6 };   // up: the drawer runners' rollers reach ~4.5 mm below the sides; 1.5 mm margin keeps them above the floor while turning

  function reset() {
    for (const g of Object.values(G)) { g.M = groups[g.id].poses[groups[g.id].start].clone(); g.pose = groups[g.id].start; }
    for (const p of parts) {
      p.state = p.startAttached ? { mode: 'group' } : { mode: 'world', M: p.layout.world ? p.layout.world.clone() : p.layout.frame.clone().multiply(new THREE.Matrix4().makeTranslation(p.center.x, p.center.y, p.center.z)) };
    }
    for (const h of hardware) h.state = { shown: false, off: 0, spin: 0, cam: 0, fade: 1 };
    marks.forEach(m => m.visible = false);
  }

  function itemWindow(a, j, k) { // item j in lane k
    const t0 = a.t0 + j * a.stagger;
    return [t0, t0 + a.per];
  }
  const actionItems = a => a.items ? a.items.map((id, j) => [id, j, 0]) : a.lanes ? a.lanes.flatMap((l, k) => l.map((id, j) => [id, j, k])) : [];

  function applyAction(a, t, isCurrent) {
    // t = local time in the step (Infinity for completed steps)
    if (a.type === 'group') {
      const ids = a.groups || [a.group];
      const u = ease(seg(t, a.t0, a.t1));
      for (const gid of ids) {
        if (u <= 0) continue;
        const g = G[gid], from = g.M.clone(), fromPose = g.pose;
        const to = groups[gid].poses[a.to];
        let M = lerpMatrix(from, to, u);
        g.M = M;
        const f0 = FLOOR[fromPose], f1 = FLOOR[a.to];
        if (f0 !== undefined && f1 !== undefined) snapToFloor(gid, f0 + (f1 - f0) * u + (u > 0 && u < 1 ? 5 * Math.sin(u * Math.PI) : 0));   // stays on (just above) the floor while it turns
        else if (u < 1 && !a.straight) g.M.premultiply(new THREE.Matrix4().makeTranslation(0, Math.sin(u * Math.PI) * 380, 0));   // carried high enough to clear what stands on the floor
        if (u >= 1) g.pose = a.to;
      }
      if (isCurrent && t > a.t0 && t < a.t1) focus = { kind: 'groups', ids };
      return;
    }
    if (a.type === 'move') {
      const lanes = a.lanes || [a.parts];
      const u = seg(t, a.t0, a.t1);
      for (const ids of lanes) for (const id of ids) {
        const p = P[id];
        if (u <= 0) continue;
        const from = a._start?.[id] ?? ((a._start = a._start || {})[id] = partWorld(p));
        const gW = groupWorld(p.group);
        const end = gW.clone().multiply(new THREE.Matrix4().makeTranslation(p.center.x, p.center.y, p.center.z));
        if (u >= 1) { p.state = { mode: 'group' }; continue; }
        const pre = gW.clone().multiply(new THREE.Matrix4().makeTranslation(p.center.x + a.offset.x, p.center.y + a.offset.y, p.center.z + a.offset.z));
        const pf = new THREE.Vector3().setFromMatrixPosition(from), pp = new THREE.Vector3().setFromMatrixPosition(pre);
        let M;
        if (u < 0.65) {
          // carry: lift, travel and turn in one arc that clears whatever lies between
          const v = ease(u / 0.65);
          M = lerpMatrix(from, pre, v);
          const pos = new THREE.Vector3().setFromMatrixPosition(M);
          pos.y = pf.y + (pp.y - pf.y) * v + Math.sin(v * Math.PI) * 260;
          M.setPosition(pos);
        } else M = lerpMatrix(pre, end, ease((u - 0.65) / 0.35));
        p.state = { mode: 'world', M };
      }
      if (isCurrent && u > 0 && u < 1) focus = { kind: 'parts', ids: lanes[0], extra: lanes.flat() };
      return;
    }
    if (a.type === 'insert' || a.type === 'place' || a.type === 'cam' || a.type === 'tighten') {
      for (const [id, j, k] of actionItems(a)) {
        const h = H[id], [w0, w1] = itemWindow(a, j, k);
        const s = seg(t, w0, w1);
        if (t < w0) continue;
        const st = h.state;
        const travel = h.placed ? 0 : h.spec.travel;
        if (a.type === 'place') {
          st.shown = true; st.placeOff = 1 - ease(s);
        } else if (a.type === 'insert') {
          st.shown = true;
          const depth = a.depth ?? 1, endOff = travel * (1 - depth);
          if (s < 0.22) { st.off = travel + 30 * (1 - s / 0.22); st.fade = s / 0.22; }
          else {
            const v = (s - 0.22) / 0.78; st.fade = 1;
            let prog;
            if (a.tool === 'hammer') { const taps = 3, q = v * taps, n = Math.floor(q), f = q - n; prog = Math.min(1, (n + (f > 0.78 ? (f - 0.78) / 0.22 : 0)) / taps); }
            else prog = ease(v);
            st.off = travel - (travel - endOff) * prog;
          }
          if (h.spec.pitch) st.spin = -(st.off / h.spec.pitch) * Math.PI * 2;
        } else if (a.type === 'tighten') {
          const from = travel * (1 - (a.from ?? 0.8));
          st.off = from * (1 - ease(s)); st.spin = -(st.off / h.spec.pitch) * Math.PI * 2;
        } else if (a.type === 'cam') {
          st.cam = Math.PI * ease(s);
        }
        if (isCurrent && t >= w0 && t < w1 && k === 0) {
          toolUse = { a, h, s };
          focus = a.tool && a.cam !== 'wide' ? { kind: 'item', id } : { kind: 'items', ids: actionItems(a).map(x => x[0]) };
        }
      }
      return;
    }
    const u = seg(t, a.t0, a.t1);
    if (a.type === 'measure' || a.type === 'mark' || a.type === 'drill') {
      if (a.type !== 'measure' && u >= (a.type === 'mark' ? 0.55 : 0.6)) showMark(a);
      if (a.type === 'measure' && isCurrent && u >= 0.7) showMeasure(a);   // the measured line stays for the rest of the step
      if (isCurrent && t > a.t0 && t < a.t1) { toolUse = { a, s: u }; focus = { kind: 'point', a }; }
    }
  }
  function showMeasure(a) {
    const gw = P[a.host] ? G[P[a.host].group].M : G[a.host].M;
    const A = a.a.clone().applyMatrix4(gw), B = a.b.clone().applyMatrix4(gw);
    if (!a._keep) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([A, B]), new THREE.LineDashedMaterial({ color: '#1b3d84', dashSize: 14, gapSize: 8, depthTest: false }));
      line.renderOrder = 25; const lab = makeLabel(a.label); lab.scale.set(150, 33, 1);
      a._keep = new THREE.Group(); a._keep.add(line, lab); a._keep.userData = { line, lab }; scene.add(a._keep); marks.push(a._keep);
    }
    const { line, lab } = a._keep.userData;
    line.geometry.setFromPoints([A, B]); line.computeLineDistances();
    lab.position.copy(A).lerp(B, a.at ?? 0.5).add(new THREE.Vector3(0, 30, 0));
    a._keep.visible = true;
  }
  function showMark(a) {
    if (!a._mark) {
      a._mark = new THREE.Mesh(new THREE.CircleGeometry(a.type === 'mark' ? 2.5 : 4, 16), new THREE.MeshBasicMaterial({ color: a.type === 'mark' ? '#3a3a3a' : '#2a2a2a' }));
      const n = (a.normal || a.dir.clone().negate()).clone().normalize();
      a._mark.position.copy(a.at).addScaledVector(n, 0.6); a._mark.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      scene.add(a._mark); marks.push(a._mark);
    }
    a._mark.visible = true;
  }

  // ---------- intro: enlarged samples of the hardware and tools to find ----------
  const samples = {};
  function sample(kind, type) {
    const key = kind + type;
    if (samples[key]) return samples[key];
    const g = new THREE.Group(), m = kind === 'hw' ? makeHardware(type) : makeTool(type);
    if (kind === 'tool' && type === 'tape') m.userData.setLength(30);
    const inner = new THREE.Group(); inner.add(m);
    if (kind === 'hw' && HW[type]) inner.rotation.x = Math.PI;            // screws stand head up
    if (kind === 'tool') inner.rotation.z = Math.PI / 2;                   // tools lie across
    const b = new THREE.Box3().setFromObject(inner), size = b.getSize(new THREE.Vector3()).length();
    const target = kind === 'tool' ? 210 : 140;
    inner.scale.setScalar(Math.min(4, Math.max(0.35, target / size)));
    const c = new THREE.Box3().setFromObject(inner).getCenter(new THREE.Vector3()); inner.position.sub(c);
    g.add(inner);
    const label = makeLabel(''); label.scale.set(230, 50, 1); g.add(label); g.userData.label = label;
    g.visible = false; scene.add(g);
    return (samples[key] = g);
  }
  let introState = null;
  function poseIntro(si, t) {
    Object.values(samples).forEach(o => o.visible = false);
    introState = null;
    const st = steps[si];
    if (!st.intro || t >= st.intro) return;
    const list = Object.entries(st.uses).map(([type, n]) => ({ kind: 'hw', type, text: `${type} × ${n}` }))
      .concat(st.tools.map(type => ({ kind: 'tool', type, text: TOOL_NAMES[type] })));
    const b = partsBox(st.find), c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0); right.y = 0; right.normalize();
    const grow = Math.min(1, t / 0.6) * Math.min(1, (st.intro - t) / 0.5);
    const gap = 250, y0 = b.max.y + 400;
    list.forEach((L, i) => {
      const o = sample(L.kind, L.type);
      o.visible = grow > 0.02;
      o.position.copy(c).addScaledVector(right, (i - (list.length - 1) / 2) * gap); o.position.y = y0;
      o.children[0].rotation.y = t * 0.9;
      o.scale.setScalar(Math.max(0.01, ease(grow)));
      o.userData.label.userData.set(L.text); o.userData.label.position.set(0, -115, 0);
    });
    introState = { box: b.clone().expandByPoint(c.clone().setY(y0 + 80)).expandByPoint(c.clone().addScaledVector(right, (list.length / 2) * gap).setY(y0)).expandByPoint(c.clone().addScaledVector(right, -(list.length / 2) * gap).setY(y0)), find: st.find };
    focus = { kind: 'intro' };
  }
  const TOOL_NAMES = { phillips: 'Stjerneskruetrækker', flat: 'Ligekærvet', hammer: 'Hammer', tape: 'Målebånd', pencil: 'Blyant', drill: 'Boremaskine' };

  function evaluate(si, p) {
    reset(); toolUse = null; focus = null;
    for (let s = 0; s <= si; s++) {
      const st = steps[s], t = s < si ? Infinity : p * st.dur;
      for (const a of st.actions) {
        if (s === si && t < a.t0 && a.type !== 'group' && a.type !== 'move') continue;
        a._start = null; a._from = null;
        applyAction(a, t, s === si);
      }
    }
    commit();
    poseTools();
    poseIntro(si, p * steps[si].dur);
    stepLabels.forEach(l => l.visible = false);
    (steps[si].labels || []).forEach((L, i) => {
      if (!stepLabels[i]) { stepLabels[i] = makeLabel(L.text); stepLabels[i].scale.set(240, 52, 1); scene.add(stepLabels[i]); }
      stepLabels[i].userData.set(L.text);
      stepLabels[i].position.copy(L.at).applyMatrix4(G[L.group].M);
      stepLabels[i].visible = p > (L.minP ?? 0.3);
    });
  }

  function commit() {
    for (const g of Object.values(G)) g.obj.matrix.copy(g.M), g.obj.matrixWorldNeedsUpdate = true;
    for (const p of parts) { p.obj.matrix.copy(partWorld(p)); p.obj.matrixWorldNeedsUpdate = true; }
    for (const h of hardware) {
      const st = h.state, o = h.obj;
      o.visible = st.shown;
      if (!st.shown) continue;
      if (h.placed) {
        o.position.copy(h.p).addScaledVector(h.approach ? h.approach : new THREE.Vector3(), st.placeOff ?? 0);
        o.quaternion.copy(h.q0);
      } else {
        o.position.copy(h.p).addScaledVector(h.d, -st.off);
        o.quaternion.copy(h.q0).multiply(_q.setFromAxisAngle(UP, st.spin + st.cam));
      }
    }
    scene.updateMatrixWorld(true);
  }

  // ---------- tools ----------
  const _p = new THREE.Vector3(), _d = new THREE.Vector3(), _wq = new THREE.Quaternion();
  // where the tool works: screw head / cam face; for a dowel the end that sticks out
  function itemHead(h, out) { return out.set(0, h.type === 'C' ? -(30 - (h.depth ?? 15)) : h.spec.head, 0).applyMatrix4(h.obj.matrixWorld); }
  function itemAxis(h, out) { h.obj.getWorldQuaternion(_wq); return out.set(0, 1, 0).applyQuaternion(_wq); }
  function perpUp(d) { const x = new THREE.Vector3().crossVectors(d, UP); if (x.lengthSq() < 1e-4) x.set(1, 0, 0); return x.normalize(); }

  function poseTools() {
    for (const t of Object.values(tools)) t.visible = false;
    arrow.visible = false; measureLabel.visible = false; turnLabel.visible = false;
    if (!toolUse) return;
    const { a, h, s } = toolUse;
    if (a.type === 'insert' || a.type === 'cam' || a.type === 'tighten') {
      if (!a.tool) return;
      const tool = tools[a.tool];
      itemHead(h, _p); itemAxis(h, _d);
      const approach = s < 0.18 ? 1 - s / 0.18 : s > 0.92 ? (s - 0.92) / 0.08 : 0;
      if (a.tool === 'hammer') {
        // handle points up (away from the work) unless the blow itself is vertical
        let x = UP.clone().addScaledVector(_d, -UP.dot(_d));
        x = x.lengthSq() > 0.05 ? x.normalize() : perpUp(_d);
        const z = new THREE.Vector3().crossVectors(x, _d);
        const M = new THREE.Matrix4().makeBasis(x, _d, z).setPosition(_p);
        // swing: rotate about the handle end (local x = 312, y = -40)
        const v = Math.max(0, (s - 0.22) / 0.78), f = (v * 3) % 1;
        const lift = s < 0.22 ? 0.55 : (f < 0.78 ? 0.55 * Math.sin((f / 0.78) * Math.PI / 2) : 0.55 * (1 - (f - 0.78) / 0.22));
        const pivot = new THREE.Vector3(312, -40, 0);
        const swing = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, 0).multiply(new THREE.Matrix4().makeRotationZ(lift))   /* + lifts the head away from the work (−d) */.multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, 0));
        M.multiply(swing).multiply(new THREE.Matrix4().makeTranslation(0, -approach * 80, 0));
        tool.matrixAutoUpdate = false; tool.matrix.copy(M); tool.visible = true;
      } else {
        h.obj.getWorldQuaternion(_wq);
        tool.matrixAutoUpdate = true;
        tool.position.copy(_p).addScaledVector(_d, -approach * 70);
        tool.quaternion.copy(_wq);
        tool.visible = true;
        // turn arrow around the item: clockwise seen from the head
        if (s > 0.18 && s < 0.95) {
          arrow.visible = true; arrow.position.copy(_p).addScaledVector(_d, -6);
          arrow.quaternion.setFromUnitVectors(UP, _d);
          const r = h.type === 'B' ? 1.25 : h.type === 'J' || h.type === 'WALLSCREW' ? 1.1 : 0.85;
          arrow.scale.setScalar(r);
          turnLabel.visible = true;
          turnLabel.position.copy(_p).addScaledVector(_d, -30).addScaledVector(perpUp(_d), 45).add(new THREE.Vector3(0, 18, 0));
        }
      }
      return;
    }
    if (a.type === 'measure') {
      const tool = tools.tape, gw = P[a.host] ? G[P[a.host].group].M : G[a.host].M;
      const A = a.a.clone().applyMatrix4(gw), B = a.b.clone().applyMatrix4(gw);
      const dir = B.clone().sub(A), L = dir.length(); dir.normalize();
      let y = UP.clone().sub(dir.clone().multiplyScalar(UP.dot(dir))); if (y.lengthSq() < 1e-3) y.set(0, 0, 1); y.normalize();
      const z = new THREE.Vector3().crossVectors(dir, y);
      tool.matrixAutoUpdate = false; tool.matrix.makeBasis(dir, y, z).setPosition(A); tool.visible = true;
      tool.userData.setLength(L * ease(Math.min(1, s / 0.7)));
      if (s > 0.7) { measureLabel.userData.set(a.label); measureLabel.position.copy(B).addScaledVector(y, 40); measureLabel.visible = true; }
      return;
    }
    if (a.type === 'mark' || a.type === 'drill') {
      const tool = tools[a.type === 'mark' ? 'pencil' : 'drill'];
      const into = a.type === 'mark' ? a.normal.clone().negate() : a.dir.clone();
      const back = s < 0.25 ? (1 - s / 0.25) * 120 : s > 0.85 ? (s - 0.85) / 0.15 * 120 : 0;
      const depth = a.type === 'drill' && s > 0.25 && s < 0.85 ? Math.sin((s - 0.25) / 0.6 * Math.PI) * 30 : 0;
      tool.matrixAutoUpdate = true;
      tool.position.copy(a.at).addScaledVector(into, -back + depth);
      tool.quaternion.setFromUnitVectors(UP, into);
      if (a.type === 'mark') tool.position.x += Math.sin(s * 40) * 1.5;
      if (a.type === 'drill') tool.rotateY(s * 120);
      tool.visible = true;
    }
  }

  // ---------- camera direction / framing ----------
  const box = new THREE.Box3();
  function partsBox(ids) {
    box.makeEmpty();
    for (const id of ids) { const p = P[id]; if (!p) continue; p.obj.updateMatrixWorld(true); box.expandByObject(p.obj.children[0]); }
    return box.clone();
  }
  function cameraGoal(si) {
    const st = steps[si];
    const defDir = (st.view || new THREE.Vector3(0.55, 0.62, 0.8)).clone().normalize();
    if (focus?.kind === 'item') {
      const h = H[focus.id], c = itemHead(h, new THREE.Vector3()), d = itemAxis(h, new THREE.Vector3());
      // look along the tool from slightly behind and above it
      // three-quarter view from the side the tool works from, never straight along the screw
      const dh = new THREE.Vector3(defDir.x, 0, defDir.z).normalize(), th = new THREE.Vector3(-d.x, 0, -d.z);
      const dir = dh.add(th.multiplyScalar(0.8)); dir.y = 0; dir.normalize(); dir.y = st.itemDirY ?? 0.6; dir.normalize();
      const r = h.type === 'J' || h.type === 'WALLSCREW' ? 210 : 170;
      return { target: c.addScaledVector(d, -70), radius: r, dir };
    }
    let b;
    if (focus?.kind === 'intro' && introState) { const ib = introState.box, c = ib.getCenter(new THREE.Vector3()); return { target: c, radius: Math.max(260, ib.getSize(new THREE.Vector3()).length() / 2 * 1.05), dir: defDir }; }
    if (focus?.kind === 'items') { b = new THREE.Box3(); for (const id of focus.ids) b.expandByObject(H[id].obj); b.expandByScalar(60); }
    else if (focus?.kind === 'parts') b = partsBox(focus.extra || focus.ids);
    else if (focus?.kind === 'groups') b = partsBox(parts.filter(p => focus.ids.includes(p.group)).map(p => p.id));
    else if (focus?.kind === 'point') { const a = focus.a; const c = a.at || (P[a.host] ? a.a.clone().applyMatrix4(G[P[a.host].group].M) : a.a.clone().applyMatrix4(G[a.host].M)); b = new THREE.Box3().setFromCenterAndSize(c, new THREE.Vector3(a.type === 'measure' ? 260 : 520, 520, 520)); if (a.b) b.expandByPoint((P[a.host] ? a.b.clone().applyMatrix4(G[P[a.host].group].M) : a.b.clone().applyMatrix4(G[a.host].M))); }
    else b = partsBox(st.focus.length ? st.focus : parts.map(p => p.id));
    const c = b.getCenter(new THREE.Vector3()), r = b.getSize(new THREE.Vector3()).length() / 2;
    return { target: c, radius: Math.max(140, r * (focus ? 1 : 1.25)), dir: defDir };
  }

  // looks: inactive panels are ghosted, panels to find glow during the intro, and the carcass can turn see-through
  const looks = { ghost: new Map(), hi: new Map() };
  const hiColor = new THREE.Color('#1b3d84');
  function lookOf(base, mode) {
    if (mode === 'hi' && !base.isMeshStandardMaterial) return base;
    const cache = looks[mode];
    if (!cache.has(base)) {
      const c = base.clone();
      if (mode === 'ghost') { c.transparent = true; c.opacity = 0.28; c.depthWrite = false; }
      else { c.emissive = hiColor.clone(); c.emissiveIntensity = 0.3; }
      cache.set(base, c);
    }
    return cache.get(base);
  }
  function setLook(p, mode) {
    if (p._look === mode) return; p._look = mode;
    // only the panel itself (hardware fastened to it keeps its own look)
    for (const o of p.obj.children) {
      if (o.userData.hw) {   // fittings on a toned-down panel are toned down with it
        o.traverse(m => { if (!m.isMesh) return; if (!m.userData.base) m.userData.base = m.material; m.material = mode === 'ghost' ? lookOf(m.userData.base, 'ghost') : m.userData.base; });
        continue;
      }
      if (!o.isMesh && !o.isLineSegments) continue;
      if (!o.userData.base) o.userData.base = o.material;
      const base = o.userData.base;
      if (o.isLineSegments) { o.visible = mode !== 'ghost'; continue; }
      o.material = mode === 'normal' ? base : Array.isArray(base) ? base.map(m => lookOf(m, mode)) : lookOf(base, mode);
    }
  }
  function applyLooks(si, p, time) {
    const st = steps[si], t = p * st.dur;
    const active = new Set([...st.focus, ...st.find]);
    // a panel counts as assembled once at least one other panel is fastened to the same group
    const attachedCount = {}; for (const q of parts) if (q.state.mode === 'group') attachedCount[q.group] = (attachedCount[q.group] || 0) + 1;
    const xray = st.xray && (focus?.kind === 'item' || focus?.kind === 'point');
    const intro = st.intro && t < st.intro;
    for (const p of parts) {
      let mode = 'normal';
      // only loose panels that are not used in this step are toned down; anything already assembled stays solid
      if (si > 0 && !active.has(p.id) && !(p.state.mode === 'group' && attachedCount[p.group] > 1)) mode = 'ghost';
      if (xray && p.group === 'carcass') mode = 'ghost';
      if (intro && st.find.includes(p.id)) mode = 'hi';
      setLook(p, mode);
    }
    looks.hi.forEach(m => m.emissiveIntensity = 0.18 + 0.14 * Math.sin(time * 5));
  }
  // ---------- test hooks: oriented boxes of everything in the world, for collision / flicker checks ----------
  const hwBox = {};
  function localBox(h) {
    if (!hwBox[h.type]) { const pr = proto(h.type); pr.updateMatrixWorld(true); hwBox[h.type] = new THREE.Box3().setFromObject(pr); }
    return hwBox[h.type].clone().translate(h.model.position);
  }
  function obb(M, box) {
    const c = box.getCenter(new THREE.Vector3()).applyMatrix4(M), half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const e = M.elements, ax = [0, 1, 2].map(i => new THREE.Vector3(e[i * 4], e[i * 4 + 1], e[i * 4 + 2]));
    const sc = ax.map(a => a.length()); ax.forEach(a => a.normalize());
    return { c: c.toArray(), a: ax.map(a => a.toArray()), h: half.toArray().map((v, i) => v * sc[i]) };
  }
  function obbs() {
    const out = [];
    for (const p of parts) {
      const hs = p.size.clone().multiplyScalar(0.5);
      let boxes = [new THREE.Box3(hs.clone().negate(), hs.clone())];
      if (p.notch) {   // the back panel's notch is real: three boxes around it
        const n = p.notch;
        boxes = [new THREE.Box3(new THREE.Vector3(-hs.x, -hs.y, -hs.z), new THREE.Vector3(hs.x, hs.y - n.h, hs.z)),
          new THREE.Box3(new THREE.Vector3(-hs.x, hs.y - n.h, -hs.z), new THREE.Vector3(-n.w / 2, hs.y, hs.z)),
          new THREE.Box3(new THREE.Vector3(n.w / 2, hs.y - n.h, -hs.z), new THREE.Vector3(hs.x, hs.y, hs.z))];
      }
      boxes.forEach((b, k) => out.push({ id: p.id, sub: k, name: `${p.id} ${p.name}`, kind: 'part', group: p.group, attached: p.state.mode === 'group', look: p._look || 'normal', ...obb(p.obj.matrixWorld, b) }));
    }
    for (const h of hardware) {
      if (!h.obj.visible) continue;
      // one box per mesh of the fitting (an L profile is two boxes, a screw is head + shank)
      h.obj.updateMatrixWorld(true);
      const inv = h.obj.matrixWorld.clone().invert();
      let k = 0;
      h.obj.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const M = o.matrixWorld;
        out.push({ id: h.id, sub: k++, name: `${h.type} (${h.id})`, kind: 'hw', type: h.type, host: h.host, mate: h.mate?.part || null, hostIsGroup: !!h.hostGroup, group: h.hostPart ? h.hostPart.group : h.host, ...obb(M, o.geometry.boundingBox) });
      });
    }
    return out;
  }
  return { evaluate, cameraGoal, steps, P, H, G, partsBox, tools, applyLooks, focusKind: () => focus?.kind, inIntro: (si, p) => steps[si].intro && p * steps[si].dur < steps[si].intro, holes, obbs };
}
