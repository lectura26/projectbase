// flicker-checker: z-fighting / flimmer.
// 1) Geometri: flader i samme plan, der vender samme vej og overlapper (to plader eller en plade og dens overlay).
// 2) Billeder: samme frame renderes to gange med stillestående kamera (skal være identiske), og én gang med kameraet
//    flyttet 0,5 mm. Normal geometri ændrer sig næsten ikke; z-fighting giver spredte pixels der skifter farve.
// Brug: node tools/check-flicker.mjs [--steps 0,5,21] [--out korup/review/flicker.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import { openGuide, arg } from './lib.mjs';

const only = arg('steps', '') ? arg('steps').split(',').map(Number) : null;
const out = arg('out', 'korup/review/flicker.json');
import { rmSync } from 'node:fs';
rmSync('korup/review/flicker', { recursive: true, force: true });   // no stale images from an earlier run
mkdirSync('korup/review/flicker', { recursive: true });
const { page, errors, close } = await openGuide({ width: 1100, height: 700 });
const info = await page.evaluate(() => window.guide.stepInfo());
const geo = [], img = [];
for (const st of info) {
  if (only && !only.includes(st.index)) continue;
  for (const p of st.actions.length ? [0.5, 1] : [0]) {
    // --- geometry: coplanar, same-facing, overlapping faces of panels ---
    const g = await page.evaluate(({ i, p }) => {
      window.guide.evalOnly(i, p);
      const objs = window.guide.obbs().filter(o => o.kind === 'part' && o.look !== 'ghost');
      const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], sub = (a, b) => a.map((v, k) => v - b[k]);
      const faces = o => [0, 1, 2].flatMap(k => [1, -1].map(s => ({ n: o.a[k].map(v => v * s), c: o.c.map((v, j) => v + o.a[k][j] * o.h[k] * s), k, o })));
      const hits = [];
      for (let x = 0; x < objs.length; x++) for (let y = x + 1; y < objs.length; y++) {
        for (const F of faces(objs[x])) for (const E of faces(objs[y])) {
          if (dot(F.n, E.n) < 0.999 || Math.abs(dot(sub(E.c, F.c), F.n)) > 0.3) continue;
          // overlap of the two rectangles in the face plane
          const axes = [0, 1, 2].filter(k => k !== F.k).map(k => F.o.a[k]);
          let area = 1;
          for (const ax of axes) {
            const r1 = [0, 1, 2].filter(k => k !== F.k).reduce((s, k) => s + F.o.h[k] * Math.abs(dot(F.o.a[k], ax)), 0);
            const r2 = [0, 1, 2].filter(k => k !== E.k).reduce((s, k) => s + E.o.h[k] * Math.abs(dot(E.o.a[k], ax)), 0);
            const d = Math.abs(dot(sub(E.c, F.c), ax)), ov = r1 + r2 - d;
            area *= Math.max(0, Math.min(ov, 2 * r1, 2 * r2));
          }
          if (area > 1) hits.push({ a: F.o.name, b: E.o.name, area: Math.round(area) });
        }
      }
      return hits;
    }, { i: st.index, p });
    for (const h of g) geo.push({ step: st.index, p, ...h });
    // --- image: identical repeat + 0.5 mm camera nudge, seen from the front and from behind ---
    for (const [view, dir] of [['forfra', [-0.55, 0.6, 0.75]], ['bagfra', [0.5, 0.6, -0.8]]]) {
    const r = await page.evaluate(async ({ i, p, dir }) => {
      window.guide.fixedView(i, p, dir);
      const A = window.guide.canvas(); window.guide.render(); const A2 = window.guide.canvas();
      window.guide.nudge(0.5); const B = window.guide.canvas(); window.guide.nudge(-0.5);
      const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; });
      const [a, a2, b] = await Promise.all([load(A), load(A2), load(B)]);
      const w = a.width, h = a.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d', { willReadFrequently: true });
      const data = im => { g.drawImage(im, 0, 0); return g.getImageData(0, 0, w, h).data; };
      const da = data(a), da2 = data(a2), db = data(b);
      let same = 0, sparkle = 0; const mark = new Uint8Array(w * h);
      for (let k = 0; k < w * h; k++) {
        const o = k * 4, d2 = Math.abs(da[o] - da2[o]) + Math.abs(da[o + 1] - da2[o + 1]) + Math.abs(da[o + 2] - da2[o + 2]);
        if (d2 > 0) same++;
        const d = Math.abs(da[o] - db[o]) + Math.abs(da[o + 1] - db[o + 1]) + Math.abs(da[o + 2] - db[o + 2]);
        if (d > 90) {
          // isolated change: the pixel differs from its neighbours in A as well (not an edge moving by a sub-pixel)
          const x = k % w, y = (k / w) | 0;
          if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
            const nb = [k - 1, k + 1, k - w, k + w].map(q => Math.abs(da[q * 4] - da[o]) + Math.abs(da[q * 4 + 1] - da[o + 1]) + Math.abs(da[q * 4 + 2] - da[o + 2]));
            if (Math.max(...nb) < 40) { sparkle++; mark[k] = 1; }
          }
        }
      }
      // bounding box of the sparkle pixels in a 32 px grid
      const cells = {};
      for (let k = 0; k < w * h; k++) if (mark[k]) { const c = `${((k % w) / 32) | 0},${((k / w / 32) | 0)}`; cells[c] = (cells[c] || 0) + 1; }
      const hot = Object.entries(cells).filter(([, n]) => n >= 6).map(([c, n]) => ({ cell: c.split(',').map(v => +v * 32), n }));
      return { unstable: same, sparkle, hot, png: hot.length ? A : null };
    }, { i: st.index, p, dir });
    const rec = { step: st.index, p, view, unstablePixels: r.unstable, sparklePixels: r.sparkle, hotCells: r.hot.slice(0, 20) };
    if (r.png) { const f = `korup/review/flicker/s${String(st.index).padStart(2, '0')}_${Math.round(p * 100)}_${view}.png`; writeFileSync(f, Buffer.from(r.png.split(',')[1], 'base64')); rec.image = f; }
    img.push(rec);
    }
  }
}
writeFileSync(out, JSON.stringify({ coplanar: geo, image: img, errors }, null, 2));
console.log(`samme-plan-flader: ${geo.length}, frames med flimmer-pixels: ${img.filter(r => r.hotCells.length).length}/${img.length}, ustabile frames: ${img.filter(r => r.unstablePixels).length}`);
for (const g of geo) console.log(`trin ${g.step} p=${g.p}: ${g.a} og ${g.b} ligger i samme plan (${g.area} mm²)`);
for (const r of img) if (r.hotCells.length || r.unstablePixels) console.log(`trin ${r.step} p=${r.p} (${r.view}): ${r.sparklePixels} spredte pixels, ${r.hotCells.length} felter, ustabile ${r.unstablePixels}${r.image ? ' → ' + r.image : ''}`);
await close();
