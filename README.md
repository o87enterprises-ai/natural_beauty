# Natural Beauty — scroll-driven shop (concept preview)

A single-page mock shop with a cinematic, scroll-scrubbed 3D sequence. Everything is real-time
Three.js — no paid video or image APIs.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (deploy anywhere: Vercel, Netlify, GitHub Pages…)
```

## The funnel

The page doesn't scroll. Each step waits for a choice, and **Back** rewinds the animation one step.

| Step | What happens | Next |
|---|---|---|
| Hero | Jar drops in and spins into place | Scroll once, or press **Shop** |
| Category | Logo lifts off, camera flies through the letters, lid opens | Pick Face / Body / Hair. Scrolling does nothing except make the buttons glow and twitch |
| Product | Rotatable jar (drag / touch), pills 1-3 switch product | **See inside** |
| Inside | Jump cut to the molecule view with glowing ingredient names | **Add to bag** |
| Bag | Lid lifts, logo floats forward and settles back, camera pulls out | **Checkout** (mock) |

## Files

- `src/scene.js` — the 3D scene (jar, monogram, leaf-shadow lighting, molecules, camera rig)
- `src/main.js` — funnel state machine (steps, history/back, scroll gate), cart, UI wiring
- `src/logo-shapes.json` — NB monogram traced from the brand logo; regenerate with `python3 tools/trace_logo.py <logo.png>` (needs `opencv-python-headless`)
- `src/data.js` — placeholder catalogue (3 categories × 3 products); edit this for real products
- `src/molecule.js` — procedural ball-and-stick molecule generator (illustrative structures)

## Swapping in real brand assets

- Logo: run `tools/trace_logo.py` on a new PNG (or swap in a hand-made SVG via `SVGLoader`).
- Label art: `labelTexture()` in `src/scene.js`.
- Products, prices, ingredients and molecules: `src/data.js`.
