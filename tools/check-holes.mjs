// hole-checker: hullerne ligger som data (guide.holes()). Tjekker mod data/manual.json → holeSpec:
// antal pr. plade og trin, at hvert hul sidder på den rigtige flade, kantafstande og c/c-afstande,
// at hvert hul ligger på pladens overflade, og at hvert beslag der sættes i har et hul.
// Brug: node tools/check-holes.mjs [--out korup/review/holes.json]
import { writeFileSync } from 'node:fs';
import { openGuide, arg } from './lib.mjs';

const out = arg('out', 'korup/review/holes.json');
const { page, errors, close } = await openGuide();
const { manual, holes, info } = await page.evaluate(async () => ({
  manual: await fetch('data/manual.json').then(r => r.json()), holes: window.guide.holes(), info: window.guide.stepInfo(),
}));
const issues = [], passes = [];
const AX = { x: 0, y: 1, z: 2 };
const faceOf = h => {   // which face of the panel the hole sits in, from position + normal
  for (let i = 0; i < 3; i++) if (Math.abs(Math.abs(h.local[i]) - h.size[i] / 2) < 0.6 && Math.abs(h.normal[i]) > 0.99) return (h.local[i] > 0 ? '+' : '-') + 'xyz'[i];
  return null;
};
// 1. every hole sits on the surface of its panel and inside its outline
for (const h of holes) {
  const f = faceOf(h);
  const inside = h.local.every((v, i) => Math.abs(v) <= h.size[i] / 2 + 0.6);
  if (!f || !inside) issues.push({ check: 'hul på overfladen', part: h.part, type: h.type, item: h.item, kind: h.kind, local: h.local, msg: !inside ? 'hullet ligger uden for pladen' : 'hullet ligger ikke i en af pladens flader (svæver eller sidder inde i pladen)' });
}
// 2. per manual rule: counts, face, edge distance, spacing
const stepItems = info.map(s => new Set(s.actions.filter(a => a.type === 'insert').flatMap(a => a.items || [])));
for (const r of manual.holeSpec.rules) {
  const hs = holes.filter(h => h.kind === 'entry' && h.type === r.type && stepItems[r.step].has(h.item));
  const groups = {};
  for (const h of hs) { const key = r.perInstance ? h.part : h.num; (groups[key] = groups[key] || []).push(h); }
  for (const [num, n] of Object.entries(r.count)) {
    const keys = r.perInstance ? ['a', 'b', 'c'].map(s => num + s) : [num];
    for (const k of keys) {
      const g = groups[k] || [];
      const tag = `trin ${r.step} ${r.type} i plade ${k}`;
      if (g.length !== n) issues.push({ check: 'antal', rule: r.source, msg: `${tag}: ${g.length} huller, manualen viser ${n}` });
      else passes.push(`${tag}: ${n} huller`);
      const want = r.onFace?.[num];
      for (const h of g) {
        const f = faceOf(h);
        if (want && !(want === '±x' ? /[+-]x/.test(f) : f === want)) issues.push({ check: 'flade', rule: r.source, msg: `${tag}: hul ${h.item} sidder i flade ${f}, forventet ${want}`, local: h.local });
        if (r.edge) {
          const i = AX[r.edge.axis], d = h.size[i] / 2 - Math.abs(h.local[i]);
          if (Math.abs(d - r.edge.mm) > r.edge.tol) issues.push({ check: 'kantafstand', rule: r.source, msg: `${tag}: hul ${h.item} er ${d.toFixed(1)} mm fra kanten, manualen siger ${r.edge.mm} mm` });
          else passes.push(`${tag}: ${h.item} ${d.toFixed(1)} mm fra kanten`);
        }
      }
      if (r.spacing && g.length >= 2) {
        const i = AX[r.spacing.axis], v = g.map(h => h.local[i]).sort((a, b) => a - b), d = v[v.length - 1] - v[0];
        if (Math.abs(d - r.spacing.mm) > r.spacing.tol) issues.push({ check: 'c/c', rule: r.source, msg: `${tag}: c/c ${d.toFixed(1)} mm, forventet ${r.spacing.mm} mm (${r.spacing.status})` });
        else passes.push(`${tag}: c/c ${d.toFixed(1)} mm`);
      }
    }
  }
}
// 3. every inserted item in a manual step has an entry hole (except group-hosted and wall items)
const holeItems = new Set(holes.filter(h => h.kind === 'entry').map(h => h.item));
for (const s of info) for (const a of s.actions) if (a.type === 'insert') for (const id of a.items || []) {
  const t = id.replace(/\d+$/, '');
  if (!holeItems.has(id) && !['PLUG', 'WALLSCREW'].includes(t)) {
    const hostedOnGroup = s.index === 11;
    if (!hostedOnGroup) issues.push({ check: 'beslag uden hul', msg: `trin ${s.index}: ${id} har intet hul i en plade` });
  }
}
const rep = { holes: holes.length, issues, passes, errors };
writeFileSync(out, JSON.stringify(rep, null, 2));
console.log(`huller: ${holes.length}, fejl: ${issues.length}, ok: ${passes.length}, sidefejl: ${errors.length}`);
for (const i of issues) console.log(`[${i.check}] ${i.msg}${i.local ? ' @ ' + i.local.join(', ') : ''}`);
await close();
