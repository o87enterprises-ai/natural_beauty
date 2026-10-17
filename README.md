# Natural Beauty — scroll-driven shop (concept preview)

A single-page mock shop with a cinematic, scroll-scrubbed 3D sequence. Everything is real-time
Three.js — no paid video or image APIs.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (deploy anywhere: Vercel, Netlify, GitHub Pages…)
```

## The scroll sequence

| Scroll stage | What happens |
|---|---|
| Hero | Jar drops in and spins into place, logo faces the camera |
| Scroll 1 → categories | NB monogram lifts off the label, camera flies through the letters, lid opens onto the cream |
| Pick a category → product | Jar pulls back to a rotatable viewer (drag / touch). Scrolling deeper triggers a jump cut to the molecule view with glowing ingredient labels |
| Bag (bottom) | Finale: lid lifts, logo floats forward and settles back, camera pulls out |

## Files

- `src/scene.js` — the 3D scene (jar, monogram, leaf-shadow lighting, molecules, camera rig)
- `src/main.js` — scroll director, cart, UI wiring
- `src/data.js` — placeholder catalogue (3 categories × 3 products); edit this for real products
- `src/molecule.js` — procedural ball-and-stick molecule generator (illustrative structures)

## Swapping in real brand assets

- Logo: replace `monogramShapes()` in `src/scene.js` (or load an SVG with `SVGLoader`).
- Label art: `labelTexture()` in `src/scene.js`.
- Products, prices, ingredients and molecules: `src/data.js`.
