// Stand-in for the 3D scene when the browser can't create a WebGL context. The funnel, cart and
// molecule names still work; only the 3D visuals are missing.
import { buildMolecule } from './molecule.js';

export function createStub() {
  let mols = [];
  const narrow = () => window.innerWidth / window.innerHeight < 0.9;
  return {
    stub: true,
    resize() {}, update() {}, reset() {}, setBackdrop() {}, start() {}, skipIntro() {}, set() {}, setMol() {}, setAutoSpin() {}, setMolProgress() {},
    setMolReveal() {}, pointer() {}, dragStart() {}, drag() {}, dragEnd() {},
    setProduct(p) { mols = p.molecules.map((m, i) => ({ name: m.name, note: m.note, formula: buildMolecule(`${m.name}-${i}`, m.kind).formula })); },
    getMolecules() { return mols; },
    molScreen(i) {
      const w = window.innerWidth, h = window.innerHeight;
      return narrow() ? { x: w / 2, y: h * (0.3 + 0.17 * i) } : { x: w * 0.64, y: h * (0.24 + 0.2 * i) };
    },
    molIn: 1,
    isMol: () => false,
  };
}
