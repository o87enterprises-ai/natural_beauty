// Procedural ball-and-stick molecule generator. Structures are illustrative (mock preview),
// but the formula shown is computed from the atoms that are actually drawn.
function rng(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildMolecule(seed, kind) {
  const r = rng(seed);
  const atoms = []; const bonds = [];
  const add = (el, x, y, z) => { atoms.push({ el, p: [x, y, z] }); return atoms.length - 1; };
  const bond = (a, b) => bonds.push([a, b]);
  const hydroxyl = (c, dx, dy, dz) => {
    const p = atoms[c].p;
    const o = add('O', p[0] + dx * 0.85, p[1] + dy * 0.85, p[2] + dz * 0.85); bond(c, o);
    const h = add('H', p[0] + dx * 1.35, p[1] + dy * 1.35 + 0.12, p[2] + dz * 1.35); bond(o, h);
  };
  const hydrogen = (c, dx, dy, dz) => {
    const p = atoms[c].p; const h = add('H', p[0] + dx * 0.62, p[1] + dy * 0.62, p[2] + dz * 0.62); bond(c, h);
  };
  const decorate = (c, dir) => {
    const useO = r() < 0.4;
    const zs = r() < 0.5 ? 1 : -1;
    if (useO) hydroxyl(c, dir[0] * 0.4, dir[1], 0.8 * zs); else hydrogen(c, dir[0] * 0.4, dir[1], 0.8 * zs);
    hydrogen(c, dir[0] * 0.4, dir[1], -0.8 * zs);
  };
  const chain = (n, ox, oy, oz, dirSign = 1) => {
    const ids = [];
    for (let i = 0; i < n; i++) {
      const up = i % 2 ? 1 : -1;
      ids.push(add('C', ox + dirSign * i * 0.95, oy + up * 0.3, oz + Math.sin(i * 1.3) * 0.18));
      if (i) bond(ids[i - 1], ids[i]);
      decorate(ids[i], [0, up]);
    }
    return ids;
  };
  const ring = (cx, cy, cz, rad = 0.95, n = 6, withN = false) => {
    const ids = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const el = withN && i === 3 ? 'N' : 'C';
      ids.push(add(el, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, cz + (i % 2 ? 0.12 : -0.12)));
      if (i) bond(ids[i - 1], ids[i]);
    }
    bond(ids[n - 1], ids[0]);
    ids.forEach((c, i) => {
      const a = (i / n) * Math.PI * 2; const dir = [Math.cos(a), Math.sin(a)];
      if (i === 0) return;
      if (atoms[c].el === 'N') hydrogen(c, dir[0], dir[1], 0.2);
      else if (r() < 0.45) hydroxyl(c, dir[0], dir[1], 0.1); else hydrogen(c, dir[0], dir[1], 0.5 * (i % 2 ? 1 : -1));
    });
    return ids;
  };

  if (kind === 'chain') chain(5 + Math.floor(r() * 4), 0, 0, 0);
  else if (kind === 'ring') ring(0, 0, 0, 0.95, 6, r() < 0.5);
  else { const rid = ring(0, 0, 0); const c0 = rid[0]; const p0 = atoms[c0].p; const ch = chain(4 + Math.floor(r() * 2), p0[0] + 0.95, p0[1] - 0.2, p0[2]); bond(c0, ch[0]); }

  // centre + normalise
  const c = [0, 0, 0];
  atoms.forEach((a) => a.p.forEach((v, i) => (c[i] += v / atoms.length)));
  atoms.forEach((a) => { a.p = a.p.map((v, i) => v - c[i]); });
  const maxR = Math.max(...atoms.map((a) => Math.hypot(...a.p)));
  const s = 1.45 / maxR;
  atoms.forEach((a) => { a.p = a.p.map((v) => v * s); });

  const count = {}; atoms.forEach((a) => (count[a.el] = (count[a.el] || 0) + 1));
  const sub = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  const num = (n) => (n === 1 ? '' : String(n).split('').map((d) => sub[+d]).join(''));
  const formula = ['C', 'H', 'N', 'O'].filter((e) => count[e]).map((e) => e + num(count[e])).join('');
  return { atoms, bonds, formula, scale: s };
}
