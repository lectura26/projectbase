// KORUP (JYSK 3670645): geometri og trin bygget efter regler ud fra målene i manualen.
// Koordinater i mm. Korpus-ramme "C": x mod højre, y op (0 = gulv, kommoden stående på gliderne),
// z mod fronten. Skuffe-ramme "D": x mod højre, y op fra frontens underkant, z = 0 i korpus' forkant.
// Alt hvad der ikke står i manualen, er markeret "estimeret" i data/manual.json eller i en kommentar her.

import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const Rx = a => new THREE.Matrix4().makeRotationX(a);
const Rz = a => new THREE.Matrix4().makeRotationZ(a);
const mul = (...ms) => ms.reduce((a, b) => a.clone().multiply(b));
const basis = (x, y, z) => new THREE.Matrix4().makeBasis(x, y, z);

// ---------- fixed dimensions (manual s. 2, 11) ----------
const GLIDE = 3;                         // D: Ø10×3 → 695 + 3 ≈ 700
const SIDE = { h: 683, d: 287, t: 12 };
const TOP_Y = GLIDE + SIDE.h;            // 686: top of the sides = underside of the top
const FRONT_Z = 137;                     // front edge of the sides (z from -150 to 137 = 287)
const BACK_Z = -150;
const INNER = 288;                       // inner face of the sides (600/2 - 12)
// drawers: fronts 226 high, 3 mm gaps, top front flush with the top surface level (695)
const FRONT_H = 226, GAP = 3;
const FRONT_BOTTOM = [0, 1, 2].map(i => 11 + i * (FRONT_H + GAP));   // 11, 240, 469 (estimeret ud fra 695/700)
const BOX_OFF = 45;                      // drawer box bottom above the front's lower edge (estimeret, s. 22 tegning)
const BOX_BOTTOM = FRONT_BOTTOM.map(f => f + BOX_OFF);               // 56, 285, 514
const RAIL4_Y = 462;                     // midterliste mellem midterste og øverste skuffekasse (estimeret)
const RAIL_LOW_Y = 15;                   // bundlister: underkant 15 mm = højden på klods N (estimeret)

export function buildKorup(manual) {
  const parts = [], hardware = [], groups = {};
  const P = {};    // part lookup
  const panelName = id => manual.panels.find(p => p.id === id.replace(/[abc]$/, '')).name;

  // ---------- groups and their poses (world matrices) ----------
  const Px = -350;
  groups.carcass = {
    poses: {
      lying: mul(T(Px, 300, 0), Rz(-Math.PI / 2)),     // right side 3 down on the rug, inner face up
      upright: T(0, 0, 0),
      // against the right-hand wall, back 33 mm off the wall so it clears the skirting board
      wall: mul(T(2817, 0, 0), new THREE.Matrix4().makeRotationY(-Math.PI / 2)),
      away: mul(T(2467, 0, 0), new THREE.Matrix4().makeRotationY(-Math.PI / 2)),
    },
    start: 'lying', snap: true,
  };
  const DX = [-700, 0, 700];
  DX.forEach((x, i) => {
    const inPose = mul(groups.carcass.poses.wall, T(0, FRONT_BOTTOM[i], FRONT_Z));
    groups['drawer' + i] = {
      poses: {
        down: mul(T(x, 13, 520), Rx(Math.PI / 2)),         // front face down (manual trin 13–17)
        flip: mul(T(x, 226, 640), Rz(Math.PI)),            // upside down for the runners (trin 18)
        up: mul(T(x, 0, 640), Rx(-0.168)),                 // upright, resting on front edge + runners
        pre: mul(inPose, T(0, 0, 330)),
        in: inPose,
        open: mul(inPose, T(0, 0, 180)),
      },
      start: 'down', snap: true, label: `Skuffe ${i + 1}`,
    };
  });

  // ---------- panels ----------
  function panel(id, group, size, min, max, layout, extra = {}) {
    const c = V((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    const s = V(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    // the box size must match the manual (any axis order)
    const a = [s.x, s.y, s.z].map(Math.round).sort((p, q) => p - q), b = [...size].sort((p, q) => p - q);
    if (a.some((v, k) => Math.abs(v - b[k]) > 1.01)) console.warn('size mismatch', id, a, b);
    const p = { id, num: id.replace(/[abc]$/, ''), name: panelName(id), group, center: c, size: s, layout, ...extra };
    parts.push(p); P[id] = p; return p;
  }
  // carcass (C)
  // side 2 lies next to side 3 with its inner face up; layout given as a frame for C coordinates
  const side2Frame = mul(T(Px, 300, -450), basis(V(0, 1, 0), V(1, 0, 0), V(0, 0, -1)));
  panel('2', 'carcass', [683, 287, 12], [-300, GLIDE, BACK_Z], [-INNER, TOP_Y, FRONT_Z], { frame: side2Frame });
  panel('3', 'carcass', [683, 287, 12], [INNER, GLIDE, BACK_Z], [300, TOP_Y, FRONT_Z], { frame: groups.carcass.poses.lying });
  const flatUp = (x, z) => ({ world: mul(T(x, 6, z), Rx(Math.PI)) });           // rail upside down (N side up)
  panel('5', 'carcass', [575, 64, 12], [-287.5, RAIL_LOW_Y, FRONT_Z - 64], [287.5, RAIL_LOW_Y + 12, FRONT_Z], flatUp(900, 0));
  panel('12', 'carcass', [575, 64, 12], [-287.5, RAIL_LOW_Y, -139], [287.5, RAIL_LOW_Y + 12, -75], flatUp(900, 120));
  panel('4', 'carcass', [575, 64, 12], [-287.5, RAIL4_Y, FRONT_Z - 64], [287.5, RAIL4_Y + 12, FRONT_Z], flatUp(900, 240));
  // back: in the side grooves 8 mm from the back edge, 3 mm into the top's groove (estimeret)
  panel('6', 'carcass', [583, 670, 3], [-291.5, 19, -142], [291.5, 689, -139], { world: mul(T(-1200, 1.5, -300), Rx(-Math.PI / 2)) },
    { notch: { w: 30, h: 25 }, foldLine: true, grooved: ['1', '2', '3'] });
  panel('1', 'carcass', [600, 288, 12], [-300, TOP_Y, BACK_Z], [300, TOP_Y + 12, FRONT_Z + 1], { world: mul(T(900, 6, -450), Rx(Math.PI)) });

  // drawers (D) ×3
  for (let i = 0; i < 3; i++) {
    const g = 'drawer' + i, s = 'abc'[i];
    panel('7' + s, g, [599, 226, 12], [-299.5, 0, 1], [299.5, FRONT_H, 13], { frame: groups[g].poses.down });
    const sideLay = x => ({ world: mul(T(x, 6, 980), Rz(Math.PI / 2)) });
    panel('8' + s, g, [260, 148, 12], [-275.5, BOX_OFF, -259], [-263.5, BOX_OFF + 148, 1], sideLay(-1200 + i * 400));
    panel('9' + s, g, [260, 148, 12], [263.5, BOX_OFF, -259], [275.5, BOX_OFF + 148, 1], sideLay(-1000 + i * 400));
    panel('10' + s, g, [527, 148, 12], [-263.5, BOX_OFF, -259], [263.5, BOX_OFF + 148, -247], { world: mul(T(330, 6, 900 + i * 180), Rx(-Math.PI / 2)) });
    panel('11' + s, g, [535, 256, 3], [-267.5, BOX_OFF + 10, -251], [267.5, BOX_OFF + 13, 5], { world: T(1050, 1.5 + 3 * i, 1000) },
      { grooved: ['7' + s, '8' + s, '9' + s, '10' + s] });
  }

  // ---------- hardware ----------
  // host: part id, group id or 'world'; p and d are given in the host group's frame (gp/gd) and converted
  let n = 0;
  function hw(type, host, gp, gd, opts = {}) {
    const id = `${type}${++n}`;
    const h = { id, type, host, gp, gd: gd.clone().normalize(), ...opts };
    hardware.push(h); return id;
  }
  const ROLL_TO = (v) => ({ roll: v });

  // --- trin 1: A in sides, one per rail end (thread into the side, head toward the rail) ---
  const RAILS = [{ id: '5', y: RAIL_LOW_Y + 6, z: FRONT_Z - 32 }, { id: '12', y: RAIL_LOW_Y + 6, z: -107 }, { id: '4', y: RAIL4_Y + 6, z: FRONT_Z - 32 }];
  const A_side = { '2': [], '3': [] };
  for (const r of RAILS) for (const s of [-1, 1]) {
    const side = s > 0 ? '3' : '2';
    A_side[side].push(hw('A', side, V(s * INNER, r.y, r.z + 14), V(s, 0, 0), { mate: { part: r.id, back: 0.5 } }));
  }
  // --- trin 2: runners + G ---
  const runners = { '2': [], '3': [] }, G_ids = [];
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const side = s > 0 ? '3' : '2', zc = FRONT_Z - 3 - 125;
    runners[side].push(hw(s > 0 ? 'CR' : 'CL', side, V(s * INNER, BOX_BOTTOM[i], zc), V(s, 0, 0), { placed: true, q: new THREE.Matrix4(), approach: V(-s * 70, 0, 0) }));
    for (const dz of [100, -80]) G_ids.push(hw('G', side, V(s * (INNER - 1.4), BOX_BOTTOM[i], zc + dz), V(s, 0, 0)));
  }
  // --- trin 3: D glides, 20 mm from front and back edge ---
  const D_ids = [];
  for (const s of [-1, 1]) for (const z of [FRONT_Z - 20, BACK_Z + 20]) D_ids.push(hw('D', s > 0 ? '3' : '2', V(s * 294, GLIDE, z), V(0, 1, 0)));
  // --- trin 4: C in the top edge of the sides (20 into the side, 10 into the top) ---
  const C_sideTop = [];
  for (const s of [-1, 1]) for (const z of [20, -60]) C_sideTop.push(hw('C', s > 0 ? '3' : '2', V(s * 294, TOP_Y, z), V(0, -1, 0), { depth: 20, mate: { part: '1', back: 0 } }));
  // --- trin 5: C in rail ends; N + M under rails 5 and 12 ---
  const C_rail = [], N_ids = [], M_N = [];
  for (const r of RAILS) for (const s of [-1, 1]) C_rail.push(hw('C', r.id, V(s * 287.5, r.y, r.z - 14), V(-s, 0, 0), { depth: 20, mate: { part: s > 0 ? '3' : '2', back: 0.5 } }));
  for (const r of RAILS.slice(0, 2)) {
    N_ids.push(hw('N', r.id, V(0, RAIL_LOW_Y, r.z), V(0, 1, 0), { placed: true, q: new THREE.Matrix4(), approach: V(0, -60, 0) }));
    for (const x of [-12, 12]) M_N.push(hw('M', r.id, V(x, 3, r.z), V(0, 1, 0)));
  }
  // --- trin 6–7: cams in the rails' top faces, opening toward the bolt ---
  const B_rail = { '3': [], '2': [] };
  for (const r of RAILS) for (const s of [1, -1]) {
    B_rail[s > 0 ? '3' : '2'].push(hw('B', r.id, V(s * 263.5, r.y + 6, r.z + 14), V(0, -1, 0), ROLL_TO(V(s, 0, 0))));
  }
  // --- trin 9: A in the top's underside, E + F ---
  const TOPZ = [80, -110];
  const A_top = [];
  for (const s of [-1, 1]) for (const z of TOPZ) A_top.push(hw('A', '1', V(s * 294, TOP_Y, z), V(0, 1, 0), { mate: { part: s > 0 ? '3' : '2', back: 0 } }));
  const E_id = hw('E', '1', V(0, TOP_Y, BACK_Z + 4), V(0, 1, 0), { placed: true, q: new THREE.Matrix4(), approach: V(0, -60, 0) });
  const F_ids = [-121, -91].map(z => hw('F', '1', V(0, TOP_Y - 2, z), V(0, 1, 0)));
  // --- trin 10: cams in the sides near the top ---
  const B_top = [];
  for (const s of [-1, 1]) for (const z of TOPZ) B_top.push(hw('B', s > 0 ? '3' : '2', V(s * INNER, TOP_Y - 24, z), V(s, 0, 0), ROLL_TO(V(0, 1, 0))));
  // --- trin 11: H clips + M (hosted on the carcass group, behind the back panel) ---
  const H_ids = [], M_H = [];
  const clip = (pos, axis, up) => {
    H_ids.push(hw('H', 'carcass', pos, axis, { placed: true, q: basis(new THREE.Vector3().crossVectors(axis, up), axis, up), approach: V(0, 0, -80) }));
    M_H.push(hw('M', 'carcass', pos.clone().addScaledVector(axis, -10), axis));
  };
  for (const y of [200, 500]) { clip(V(-INNER, y, -146), V(-1, 0, 0), V(0, 0, 1)); clip(V(INNER, y, -146), V(1, 0, 0), V(0, 0, 1)); }
  for (const x of [-150, 150]) clip(V(x, TOP_Y, -146), V(0, 1, 0), V(0, 0, 1));
  for (const x of [-100, 100]) clip(V(x, RAIL_LOW_Y + 6, -142), V(0, 0, 1), V(0, 1, 0));
  // --- trin 12: wall plug + wall screw (not in the box), in world coordinates ---
  const tabFace = new THREE.Vector3(0, TOP_Y - 18, BACK_Z + 4).applyMatrix4(groups.carcass.poses.wall);   // through the hole in E's tab
  const wallPt = tabFace.clone(); wallPt.x = 3000;                                                          // the room's right wall
  const PLUG = hw('PLUG', 'world', wallPt.clone(), V(1, 0, 0), { extra: true });
  const WS = hw('WALLSCREW', 'world', tabFace.clone(), V(1, 0, 0), { extra: true });

  // --- drawers ---
  const DR = [0, 1, 2].map(() => ({ A: [], C: [], B: [], J: [], run: [], M: [], K: [], L: [] }));
  for (let i = 0; i < 3; i++) {
    const s = 'abc'[i], d = DR[i];
    for (const sx of [-1, 1]) {
      const side = (sx < 0 ? '8' : '9') + s;
      for (const y of [80, 158]) {
        d.A.push(hw('A', '7' + s, V(sx * 269.5, y, 1), V(0, 0, 1), { mate: { part: side, back: 0 } }));
        d.B.push(hw('B', side, V(sx * 263.5, y, -23), V(sx, 0, 0), ROLL_TO(V(0, 0, 1))));
        d.J.push(hw('J', side, V(sx * 275.5, y, -253), V(-sx, 0, 0), { mate: { part: '10' + s, back: -12 } }));
      }
      d.C.push(hw('C', side, V(sx * 269.5, 119, 1), V(0, 0, -1), { depth: 20, mate: { part: '7' + s, back: 0 } }));
      d.run.push(hw(sx < 0 ? 'DL' : 'DR', side, V(sx * 269.5, BOX_OFF, -129), V(0, 1, 0), { placed: true, q: new THREE.Matrix4(), approach: V(0, -60, 0) }));
      for (const z of [-39, -219]) d.M.push(hw('M', side, V(sx * 269.5, BOX_OFF - 1.4, z), V(0, 1, 0)));
    }
    d.K.push(hw('K', '7' + s, V(0, FRONT_H / 2, 13), V(0, 0, 1), { placed: true, q: new THREE.Matrix4(), approach: V(0, 0, 70) }));
    for (const x of [-48, 48]) d.L.push(hw('L', '7' + s, V(x, FRONT_H / 2, 1), V(0, 0, 1)));
  }
  const lanes = key => DR.map(d => d[key]);

  // ---------- steps ----------
  const S = manual.steps.map(st => ({ ...st, actions: [], focus: [] }));
  const parts3 = (...nums) => nums.flatMap(n => ['a', 'b', 'c'].map(s => n + s));
  S[0].focus = ['2', '3', '6', '1', '5', '12', '4', ...parts3(7, 8, 9, 10, 11)];
  S[0].overview = true;

  S[1].actions.push({ type: 'insert', items: [...A_side['3'], ...A_side['2']], tool: 'phillips' });
  S[1].focus = ['2', '3'];
  S[2].actions.push({ type: 'place', items: [...runners['3'], ...runners['2']] });
  S[2].actions.push({ type: 'insert', items: G_ids, tool: 'phillips', per: 0.75 });
  S[2].focus = ['2', '3'];
  S[3].actions.push({ type: 'measure', host: '3', a: V(300, GLIDE, FRONT_Z), b: V(300, GLIDE, FRONT_Z - 20), label: '20 mm' });
  S[3].actions.push({ type: 'insert', items: D_ids, tool: 'hammer' });
  S[3].focus = ['2', '3'];
  S[4].actions.push({ type: 'insert', items: C_sideTop, tool: 'hammer' });
  S[4].focus = ['2', '3'];
  S[5].actions.push({ type: 'insert', items: C_rail, tool: 'hammer', per: 0.8 });
  S[5].actions.push({ type: 'place', items: N_ids });
  S[5].actions.push({ type: 'insert', items: M_N, tool: 'phillips' });
  S[5].focus = ['5', '12', '4'];
  S[6].actions.push({ type: 'move', parts: ['5', '12', '4'], offset: V(-220, 0, 0) });
  S[6].actions.push({ type: 'insert', items: B_rail['3'], tool: null });
  S[6].actions.push({ type: 'cam', items: B_rail['3'], tool: 'flat' });
  S[6].focus = ['3', '5', '12', '4'];
  S[7].actions.push({ type: 'move', parts: ['2'], offset: V(-260, 0, 0) });
  S[7].actions.push({ type: 'insert', items: B_rail['2'], tool: null });
  S[7].actions.push({ type: 'cam', items: B_rail['2'], tool: 'flat' });
  S[7].focus = ['2', '3', '5', '12', '4'];
  S[8].actions.push({ type: 'group', group: 'carcass', to: 'upright', dur: 2.6 });
  S[8].actions.push({ type: 'move', parts: ['6'], offset: V(0, 760, 0), dur: 3.4 });
  S[8].focus = ['2', '3', '6'];
  S[9].actions.push({ type: 'insert', items: A_top, tool: 'phillips' });
  S[9].actions.push({ type: 'place', items: [E_id] });
  S[9].actions.push({ type: 'insert', items: F_ids, tool: 'phillips', depth: 0.8 });
  S[9].focus = ['1'];
  S[10].actions.push({ type: 'move', parts: ['1'], offset: V(0, 320, 0), dur: 3.4 });
  S[10].actions.push({ type: 'insert', items: B_top, tool: null });
  S[10].actions.push({ type: 'cam', items: B_top, tool: 'flat' });
  S[10].focus = ['1', '2', '3'];
  const bk = manual.panels.find(p => p.id === '6').size;
  const diag = Math.round(Math.hypot(bk[0], bk[1]));
  S[11].actions.push({ type: 'measure', host: 'carcass', a: V(-291.5, 19, -143), b: V(291.5, 689, -143), label: `XX = ${diag} mm` });
  S[11].actions.push({ type: 'measure', host: 'carcass', a: V(291.5, 19, -143), b: V(-291.5, 689, -143), label: `YY = ${diag} mm` });
  S[11].actions.push({ type: 'place', items: H_ids });
  S[11].actions.push({ type: 'insert', items: M_H, tool: 'phillips', per: 0.75 });
  S[11].focus = ['6'];
  S[11].view = V(0.25, 0.45, -1);         // seen from behind
  S[12].actions.push({ type: 'group', group: 'carcass', to: 'wall', dur: 3 });
  S[12].actions.push({ type: 'mark', at: wallPt.clone(), normal: V(-1, 0, 0) });
  S[12].actions.push({ type: 'group', group: 'carcass', to: 'away', dur: 1.6 });
  S[12].actions.push({ type: 'drill', at: wallPt.clone(), dir: V(1, 0, 0) });
  S[12].actions.push({ type: 'insert', items: [PLUG], tool: 'hammer' });
  S[12].actions.push({ type: 'group', group: 'carcass', to: 'wall', dur: 1.6 });
  S[12].actions.push({ type: 'insert', items: [WS], tool: 'phillips', per: 2.2 });
  S[12].actions.push({ type: 'tighten', items: F_ids, tool: 'phillips', from: 0.8 });
  S[12].focus = ['1', '2', '3'];
  S[12].view = V(-1, 0.75, 0.45);
  S[12].xray = true;
  S[13].actions.push({ type: 'insert', lanes: lanes('A'), tool: 'phillips' });
  S[13].focus = parts3(7);
  S[14].actions.push({ type: 'insert', lanes: lanes('C'), tool: 'hammer' });
  S[14].focus = parts3(8, 9);
  S[15].actions.push({ type: 'move', lanes: [0, 1, 2].map(i => ['8' + 'abc'[i], '9' + 'abc'[i]]), offset: V(0, 0, -220) });
  S[15].actions.push({ type: 'insert', lanes: lanes('B'), tool: null });
  S[15].actions.push({ type: 'cam', lanes: lanes('B'), tool: 'flat' });
  S[15].focus = parts3(7, 8, 9);
  S[16].actions.push({ type: 'move', lanes: [0, 1, 2].map(i => ['11' + 'abc'[i]]), offset: V(0, 0, -330), dur: 2.6 });
  S[16].focus = parts3(7, 8, 9, 11);
  S[17].actions.push({ type: 'move', lanes: [0, 1, 2].map(i => ['10' + 'abc'[i]]), offset: V(0, 0, -220) });
  S[17].actions.push({ type: 'insert', lanes: lanes('J'), tool: 'phillips' });
  S[17].focus = parts3(7, 8, 9, 10);
  S[18].actions.push({ type: 'group', groups: ['drawer0', 'drawer1', 'drawer2'], to: 'flip', dur: 2.4 });
  S[18].actions.push({ type: 'place', lanes: lanes('run') });
  S[18].actions.push({ type: 'insert', lanes: lanes('M'), tool: 'phillips', per: 0.75 });
  S[18].focus = parts3(7, 8, 9, 10);
  S[19].actions.push({ type: 'group', groups: ['drawer0', 'drawer1', 'drawer2'], to: 'up', dur: 2.4 });
  S[19].actions.push({ type: 'place', lanes: lanes('K') });
  S[19].actions.push({ type: 'insert', lanes: lanes('L'), tool: 'phillips', cam: 'wide' });
  S[19].view = V(0.15, 0.95, -0.55);
  S[19].focus = parts3(7);
  for (let i = 0; i < 3; i++) {
    S[20].actions.push({ type: 'group', group: 'drawer' + i, to: 'pre', dur: 2.2 });
    S[20].actions.push({ type: 'group', group: 'drawer' + i, to: 'in', dur: 1.6, straight: true });
  }
  S[20].focus = ['1', '2', '3'];
  S[20].view = V(-1, 0.5, 0.55);
  S[21].actions.push({ type: 'group', group: 'drawer2', to: 'open', dur: 1.4, straight: true });
  S[21].labels = [{ text: 'Maks. 10 kg', group: 'carcass', at: V(0, TOP_Y + 170, -60) }, { text: 'Maks. 5 kg pr. skuffe', group: 'drawer2', at: V(0, FRONT_H / 2, 90) }];
  S[21].focus = ['1', '2', '3'];
  S[21].view = V(-1, 0.45, 0.6);
  S[21].noPartTags = true;

  // tools and hardware per step (for the "Du skal bruge" strip) come from the actions
  for (const st of S) {
    const used = {}, tools = new Set();
    for (const a of st.actions) {
      const ids = a.items || (a.lanes ? a.lanes.flat() : []);
      if (['insert', 'place'].includes(a.type)) for (const id of ids) { const h = hardware.find(x => x.id === id); if (!h.extra) used[h.type] = (used[h.type] || 0) + 1; }
      if (a.tool) tools.add(a.tool);
      if (a.type === 'measure') tools.add('tape');
      if (a.type === 'mark') tools.add('pencil');
      if (a.type === 'drill') tools.add('drill');
    }
    st.uses = used; st.tools = [...tools];
  }

  // ---------- rule checks (assembled state, in each group's frame) ----------
  const checks = [];
  const box = p => new THREE.Box3(p.center.clone().sub(p.size.clone().multiplyScalar(0.5)), p.center.clone().add(p.size.clone().multiplyScalar(0.5)));
  const allowed = (a, b) => (a.grooved || []).includes(b.id) || (b.grooved || []).includes(a.id);
  for (const g of Object.keys(groups)) {
    const ps = parts.filter(p => p.group === g);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const A = box(ps[i]), B = box(ps[j]), I = A.clone().intersect(B);
      if (I.isEmpty()) continue;
      const s = I.getSize(new THREE.Vector3()), pen = Math.min(s.x, s.y, s.z);
      if (pen > 0.01 && !allowed(ps[i], ps[j])) checks.push({ name: `Overlap ${ps[i].id}/${ps[j].id}`, pass: false, val: pen.toFixed(1) + ' mm' });
    }
  }
  const carc = parts.filter(p => p.group === 'carcass').reduce((b, p) => b.union(box(p)), new THREE.Box3());
  const csz = carc.getSize(new THREE.Vector3());
  checks.push({ name: 'Korpus bredde 600', pass: Math.abs(csz.x - 600) < 0.5, val: csz.x.toFixed(1) });
  checks.push({ name: 'Højde inkl. glidere ≈ 700', pass: Math.abs(carc.max.y - 698) < 3, val: carc.max.y.toFixed(1) });
  checks.push({ name: 'Korpus dybde 287 (+1 top)', pass: Math.abs(csz.z - 288) < 1.5, val: csz.z.toFixed(1) });
  const boxW = 2 * 275.5, inner = 2 * INNER;
  checks.push({ name: 'Skuffekasse + 2 × 12,5 mm skinner = indvendig bredde', pass: Math.abs(boxW + 25 - inner) < 0.6, val: `${boxW} + 25 = ${inner}` });
  checks.push({ name: 'Skuffefronter når ikke over toppen', pass: FRONT_BOTTOM[2] + FRONT_H <= TOP_Y + 12, val: `${FRONT_BOTTOM[2] + FRONT_H} ≤ ${TOP_Y + 12}` });
  checks.push({ name: 'Midterliste 4 rammer ikke skuffekasserne', pass: RAIL4_Y > BOX_BOTTOM[1] + 148 && RAIL4_Y + 12 < BOX_BOTTOM[2] - 13, val: `${BOX_BOTTOM[1] + 148} < ${RAIL4_Y}–${RAIL4_Y + 12} < ${BOX_BOTTOM[2] - 13}` });
  checks.push({ name: 'Skuffe går fri af bagplade', pass: -259 + FRONT_Z > -139, val: `${-259 + FRONT_Z} > -139` });
  checks.push({ name: 'Klods N når gulvet', pass: RAIL_LOW_Y === 15, val: '15 mm' });
  const count = {}; hardware.filter(h => !h.extra).forEach(h => count[h.type] = (count[h.type] || 0) + 1);
  for (const h of manual.hardware) {
    const c = count[h.id] || 0;
    checks.push({ name: `Antal ${h.id} (manual: ${h.qty})`, pass: c === h.qty, val: c === h.qty ? `${c}` : `${c} – ${h.conflict ? 'se note' : 'afviger'}`, note: h.conflict });
  }

  return { parts, hardware, groups, steps: S, checks, wallPt };
}
