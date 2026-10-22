// collision-checker: afspiller hvert trin frame for frame og finder dele, der går ind i hinanden.
// Kun relative bevægelser tælles (to dele der står stille i forhold til hinanden er tjekket af modellens statiske regler).
// Tilladte kontakter læses fra data/manual.json → allowedContacts.
// Brug: node tools/check-collisions.mjs [--fps 8] [--steps 1,2,3] [--out korup/review/collisions.json]
import { writeFileSync } from 'node:fs';
import { openGuide, arg } from './lib.mjs';

const fps = +arg('fps', 8), only = arg('steps', '') ? arg('steps').split(',').map(Number) : null;
const out = arg('out', 'korup/review/collisions.json');
const { page, errors, close } = await openGuide();
const manual = await page.evaluate(() => fetch('data/manual.json').then(r => r.json()));
const info = await page.evaluate(() => window.guide.stepInfo());

const result = await page.evaluate(({ fps, only, allowed, info }) => {
  const tol = allowed.tolerance_mm ?? 0.5;
  const groove = new Set(allowed.grooves.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
  const num = id => id.replace(/[abc]$/, ''), inst = id => (id.match(/[abc]$/) || [''])[0];
  const groupHosted = new Set(allowed.groupHostedHardware || []);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // separating-axis test for two oriented boxes; returns the smallest overlap (penetration) or 0
  function pen(A, B) {
    const axes = [...A.a, ...B.a];
    for (const u of A.a) for (const v of B.a) { const c = cross(u, v), l = Math.hypot(...c); if (l > 1e-6) axes.push(c.map(x => x / l)); }
    const d = sub(B.c, A.c); let best = Infinity;
    for (const L of axes) {
      const rA = A.h[0] * Math.abs(dot(A.a[0], L)) + A.h[1] * Math.abs(dot(A.a[1], L)) + A.h[2] * Math.abs(dot(A.a[2], L));
      const rB = B.h[0] * Math.abs(dot(B.a[0], L)) + B.h[1] * Math.abs(dot(B.a[1], L)) + B.h[2] * Math.abs(dot(B.a[2], L));
      const o = rA + rB - Math.abs(dot(d, L));
      if (o <= tol) return 0;
      best = Math.min(best, o);
    }
    return best;
  }
  const allowedPair = (A, B) => {
    if (A.kind === 'hw' && B.kind === 'hw') return true;                                 // hardware against hardware is not checked
    if (A.kind === 'hw' || B.kind === 'hw') {
      const h = A.kind === 'hw' ? A : B, p = A.kind === 'hw' ? B : A;
      if (h.host === p.id || h.mate === p.id) return true;
      if (h.hostIsGroup && groupHosted.has(h.type) && p.group === h.host) return true;
      return false;
    }
    return groove.has(`${num(A.id)}|${num(B.id)}`) && inst(A.id) === inst(B.id);
  };
  const minY = o => o.c[1] - o.h.reduce((s, h, i) => s + h * Math.abs(o.a[i][1]), 0);
  const events = new Map(), floor = new Map();
  let frames = 0;
  for (const st of info) {
    if (!st.actions.length || (only && !only.includes(st.index))) continue;
    const n = Math.max(2, Math.ceil(st.dur * fps));
    let prev = null;
    for (let f = 0; f <= n; f++) {
      const p = f / n; window.guide.evalOnly(st.index, p); frames++;
      const objs = window.guide.obbs(); objs.forEach(o => o.key = `${o.id}/${o.sub}`);
      const byId = Object.fromEntries(objs.map(o => [o.key, o]));
      const moved = new Set();
      if (prev) for (const o of objs) { const q = prev[o.key]; if (!q || Math.hypot(...sub(o.c, q.c)) > 0.05 || o.a.some((a, i) => Math.abs(dot(a, q.a[i]) - 1) > 1e-6)) moved.add(o.key); }
      for (const o of objs) {
        const y = minY(o);
        if (y < -tol) { const k = `${st.index}|${o.id}`, e = floor.get(k); if (!e) floor.set(k, { step: st.index, name: o.name, first: p, last: p, min: y }); else { e.last = p; e.min = Math.min(e.min, y); } }
      }
      // pose of B seen from A: unchanged between frames = the two move rigidly together (e.g. a whole group turning)
      const rel = (A, B) => { const d = sub(B.c, A.c); return [...A.a.map(a => dot(d, a)), ...A.a.flatMap(a => B.a.map(b => dot(a, b)))]; };
      if (prev) for (const key of moved) {
        const A = byId[key];
        for (const B of objs) {
          if (B.id === A.id || (moved.has(B.key) && B.key < key) || allowedPair(A, B)) continue;
          const qa = prev[A.key], qb = prev[B.key];
          if (qa && qb) { const r1 = rel(A, B), r0 = rel(qa, qb); if (r1.every((v, k) => Math.abs(v - r0[k]) < (k < 3 ? 0.05 : 1e-5))) continue; }
          const d = pen(A, B);
          if (d > 0) {
            const k = `${st.index}|${[A.id, B.id].sort().join('|')}`, e = events.get(k), t = +(p * st.dur).toFixed(2);
            if (!e) events.set(k, { step: st.index, title: st.title, a: A.name, b: B.name, firstFrame: f, lastFrame: f, firstT: t, lastT: t, frames: 1, maxDepth: +d.toFixed(1) });
            else { e.lastFrame = f; e.lastT = t; e.frames++; e.maxDepth = Math.max(e.maxDepth, +d.toFixed(1)); }
          }
        }
      }
      prev = byId;
    }
  }
  return { frames, collisions: [...events.values()], floor: [...floor.values()] };
}, { fps, only, allowed: manual.allowedContacts, info });

result.fps = fps; result.errors = errors;
writeFileSync(out, JSON.stringify(result, null, 2));
console.log(`frames: ${result.frames}, kollisioner: ${result.collisions.length}, under gulv: ${result.floor.length}, sidefejl: ${errors.length}`);
for (const c of result.collisions) console.log(`trin ${c.step} (${c.title}) t=${c.firstT}–${c.lastT}s frames ${c.firstFrame}–${c.lastFrame}: ${c.a} ↔ ${c.b}, max ${c.maxDepth} mm`);
for (const f of result.floor) console.log(`trin ${f.step}: ${f.name} under gulvet (${f.min.toFixed(1)} mm) p=${f.first.toFixed(2)}–${f.last.toFixed(2)}`);
await close();
