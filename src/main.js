import './styles.css';
import { createScene } from './scene.js';
import { createStub } from './stub.js';
import { categories, byCategory, products, productById } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);
const sm = (v, a, b) => ease(clamp((v - a) / (b - a)));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
const money = (n) => `$${n.toFixed(2).replace(/\.00$/, '')}`;
const narrow = () => window.innerWidth / window.innerHeight < 0.9;

/* ------------------------------------------------------------------ cart */
let cart = {};
try { cart = JSON.parse(localStorage.getItem('nb-cart') || '{}'); } catch { cart = {}; }
Object.keys(cart).forEach((id) => { if (!productById(id)) delete cart[id]; });
const saveCart = () => { try { localStorage.setItem('nb-cart', JSON.stringify(cart)); } catch { /* private mode */ } };
const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);

function updateBadge(bump) {
  const badge = $('#cartCount'); badge.textContent = cartCount();
  if (bump) { badge.classList.add('bump'); setTimeout(() => badge.classList.remove('bump'), 260); }
}

function renderBag() {
  const body = $('#cartBody'); const ids = Object.keys(cart);
  if (state.step === 'done') {
    body.innerHTML = `<div class="done"><h2>Thank you.</h2>
      <p class="cart-empty">Concept preview. Nothing was charged and nothing will ship.</p>
      <button class="btn btn-solid cta" id="restart">Start over</button></div>`;
    return;
  }
  if (!ids.length) {
    body.innerHTML = `<h2>Your bag is empty</h2><button class="btn btn-solid cta" id="keep">Shop</button>`;
    return;
  }
  const subtotal = ids.reduce((a, id) => a + productById(id).price * cart[id], 0);
  const ship = subtotal >= 50 ? 0 : 5;
  body.innerHTML = `<h2>Your bag</h2>
    ${ids.map((id) => { const p = productById(id); return `<div class="cart-item" data-id="${id}">
      <div class="thumb"><i></i></div>
      <div><h4>${p.name}</h4><small>${p.size}</small>
        <div class="qty"><button data-d="-1" aria-label="Remove one">−</button><span>${cart[id]}</span><button data-d="1" aria-label="Add one">+</button></div></div>
      <div class="amt">${money(p.price * cart[id])}</div></div>`; }).join('')}
    <div class="cart-sum">
      <div><span>Shipping</span><span>${ship ? money(ship) : 'Free'}</span></div>
      <div class="total"><span>Total</span><span>${money(subtotal + ship)}</span></div></div>
    <button class="btn btn-solid cta" id="checkout">Checkout</button>
    <button class="link" id="keep">Keep shopping</button>
    <p class="fine">Concept preview · no payment taken</p>`;
}

/* ------------------------------------------------------------------ funnel state */
let state = { step: 'hero', cat: null, pi: 0 };
const stack = [];
let t2 = 0, t2T = 0;      // hero -> category fly-through (0..1), time driven so it can rewind
let f = 0, fT = 0;        // bag finale (0..1)
let stepAt = performance.now();
let insideAt = 0;
let molApplied = false, molBusy = false, desiredMol = false;
let reveals = [0, 0, 0];
// "See inside" timeline, seconds from pressing the button
const TL = { bev: 2.0, diveA: 1.6, diveB: 4.2, fadeA: 3.4, swap: 4.8, unfade: 5.8, mol0: 5.4, gap: 1.5, card: 7.0, reveal: 1.8 };

// If the browser won't give us a WebGL context, keep the shop usable with a simple 2D version.
let sc;
try { sc = createScene($('#gl')); } catch (err) {
  console.error('3D unavailable:', err);
  sc = createStub();
  document.body.classList.add('no3d');
  const n = $('#notice');
  n.innerHTML = `3D preview isn't available in this browser, so you're seeing the simple version.<small>${String((err && err.message) || err).replace(/[<>&]/g, '')}</small>`;
  n.hidden = false;
}
const PANEL = { hero: 'hero', cats: 'cats', product: 'shop', inside: 'shop', bag: 'bag', done: 'bag' };
const curList = () => byCategory(state.cat);
const curProduct = () => curList()[state.pi];

function go(next) { stack.push({ ...state }); state = { ...state, ...next }; apply(); }
function back() {
  if (!stack.length) return;
  state = stack.pop(); apply();
}

function apply() {
  const { step } = state;
  stepAt = performance.now();
  document.body.dataset.step = step;
  $$('.step').forEach((el) => el.classList.toggle('on', el.dataset.panel === PANEL[step]));
  t2T = step === 'hero' ? 0 : 1;
  fT = step === 'bag' || step === 'done' ? 1 : 0;

  const side = step === 'product' || step === 'inside' || step === 'bag' || step === 'done';
  sc.set('product', side ? 1 : 0);
  updateShift();
  sc.setAutoSpin(step === 'product');
  if (step !== 'inside') requestMol(false);
  if (step === 'inside') insideAt = performance.now();
  $('#fade').style.opacity = 0;

  if (step === 'product' || step === 'inside') showProduct(state.pi, true);
  if (step === 'product') { const h = $('#hint'); h.classList.add('show'); clearTimeout(h._t); h._t = setTimeout(() => h.classList.remove('show'), 5000); }
  if (step === 'bag' || step === 'done') renderBag();
  clearHot();
}

function updateShift() {
  if (state.step === 'inside') return;
  const side = ['product', 'inside', 'bag', 'done'].includes(state.step);
  sc.set('shiftX', side && !narrow() ? 1 : 0);
  sc.set('shiftY', side && narrow() ? (state.step === 'bag' || state.step === 'done' ? 2.4 : 1) : 0);
}

/* product card */
function buildPills() {
  $('#pills').innerHTML = curList().map((p, i) => `<button class="pill" role="tab" data-i="${i}" aria-label="${p.name}">${i + 1}</button>`).join('');
}
function showProduct(i, instant) {
  state.pi = i;
  const p = curProduct(); const card = $('#card');
  const write = () => {
    $('#pName').textContent = p.name; $('#pMeta').textContent = `${money(p.price)} · ${p.size}`;
    $('#mainCta').textContent = state.step === 'inside' ? `Add to bag · ${money(p.price)}` : 'See inside';
    card.classList.remove('swap');
  };
  if (!$('#pills').children.length || $('#pills').dataset.cat !== state.cat) { buildPills(); $('#pills').dataset.cat = state.cat; }
  $$('.pill').forEach((b, k) => { b.classList.toggle('active', k === i); b.setAttribute('aria-selected', k === i); });
  sc.setProduct(p);
  if (instant) write(); else { card.classList.add('swap'); setTimeout(write, 220); }
}

$('#pills').addEventListener('click', (e) => {
  const b = e.target.closest('.pill'); if (!b || state.step !== 'product') return;
  const i = Number(b.dataset.i); if (i !== state.pi) showProduct(i);
});
$('#mainCta').addEventListener('click', () => {
  if (state.step === 'product') go({ step: 'inside' });
  else if (state.step === 'inside') {
    const p = curProduct(); cart[p.id] = (cart[p.id] || 0) + 1; saveCart(); updateBadge(true); go({ step: 'bag' });
  }
});

/* categories */
$('#cats').innerHTML = categories.map((c, i) => `<button class="cat-btn" data-cat="${c.id}"><small>0${i + 1}</small>${c.name}</button>`).join('');
$('#cats').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  state.cat = b.dataset.cat; $('#pills').dataset.cat = ''; go({ step: 'product', cat: b.dataset.cat, pi: 0 });
});

/* hero / bag / chrome */
$('#enter').addEventListener('click', () => { if (state.step === 'hero') go({ step: 'cats' }); });
$('#back').addEventListener('click', back);
$('#cartBtn').addEventListener('click', () => { if (state.step !== 'bag' && state.step !== 'done') go({ step: 'bag' }); });
$('#cartBody').addEventListener('click', (e) => {
  const q = e.target.closest('button[data-d]');
  if (q) {
    const id = q.closest('.cart-item').dataset.id;
    cart[id] = (cart[id] || 0) + Number(q.dataset.d); if (cart[id] <= 0) delete cart[id];
    saveCart(); updateBadge(); renderBag(); return;
  }
  if (e.target.closest('#checkout')) {
    cart = {}; saveCart(); updateBadge();
    stack.length = 0; stack.push({ step: 'hero', cat: null, pi: 0 }, { step: 'cats', cat: null, pi: 0 });
    state = { ...state, step: 'done' }; apply(); return;
  }
  if (e.target.closest('#keep')) { stack.length = 0; stack.push({ step: 'hero', cat: null, pi: 0 }); state = { step: 'cats', cat: null, pi: 0 }; apply(); return; }
  if (e.target.closest('#restart')) restart();
});

/* start over: a cream curtain, then the whole scene begins again from the very first frame (no rewinding) */
function restart() {
  const c = $('#curtain'); c.classList.remove('go'); void c.offsetWidth; c.classList.add('go');
  setTimeout(() => {
    stack.length = 0; state = { step: 'hero', cat: null, pi: 0 };
    t2 = 0; f = 0; sc.reset(); sc.setProduct(products[0], true);
    apply(); sc.start();
  }, 380);
}

/* viewer drag */
(() => {
  const el = $('#viewer'); let last = null;
  el.addEventListener('pointerdown', (e) => { last = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); sc.dragStart(); $('#hint').classList.remove('show'); });
  el.addEventListener('pointermove', (e) => { if (!last) return; sc.drag(e.clientX - last.x, e.clientY - last.y, false); last = { x: e.clientX, y: e.clientY }; });
  const end = () => { if (last) { last = null; sc.dragEnd(); } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
})();
window.addEventListener('pointermove', (e) => sc.pointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1)), { passive: true });

/* ------------------------------------------------------------------ scroll gate */
// Scrolling does nothing past a choice: it only makes the next button glow and twitch.
let gestures = [], lastEvent = 0, lastNudge = 0, hotTimer;
const nudgeTargets = () => {
  switch (state.step) {
    case 'cats': return t2 > 0.86 ? $$('.cat-btn') : [];
    case 'product': case 'inside': return [$('#mainCta')];
    case 'bag': return $$('#cartBody .cta');
    default: return [];
  }
};
function clearHot() { clearTimeout(hotTimer); gestures = []; $$('.hot').forEach((e) => e.classList.remove('hot')); }
function attempt(dir) {
  const now = performance.now();
  if (state.step === 'hero') { if (dir > 0 && now - stepAt > 500) go({ step: 'cats' }); return; }
  if (dir <= 0 || now - stepAt < 900) return;
  if (now - lastEvent > 250) gestures.push(now);      // one entry per physical scroll gesture, not per wheel tick
  lastEvent = now;
  gestures = gestures.filter((t) => now - t < 8000);
  if (now - lastNudge < 700) return;
  lastNudge = now;
  const hot = gestures.length >= 3;
  nudgeTargets().forEach((el) => {
    el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
    if (hot) el.classList.add('hot');
  });
  clearTimeout(hotTimer); hotTimer = setTimeout(clearHot, 8000);
}
// once the glow flash ends, drop .nudge so a sustained .hot glow can pulse
document.addEventListener('animationend', (e) => { if (e.animationName === 'glow') e.target.classList.remove('nudge'); });
window.addEventListener('wheel', (e) => { e.preventDefault(); if (Math.abs(e.deltaY) > 2) attempt(Math.sign(e.deltaY)); }, { passive: false });
let touchY = null;
window.addEventListener('touchstart', (e) => { touchY = e.target.closest('#viewer, .cart-panel') ? null : e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchend', (e) => {
  if (touchY === null) return;
  const dy = touchY - e.changedTouches[0].clientY; touchY = null;
  if (Math.abs(dy) > 28) attempt(Math.sign(dy));
}, { passive: true });
window.addEventListener('keydown', (e) => {
  const onButton = e.target.closest && e.target.closest('button, a');
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !onButton)) { e.preventDefault(); attempt(1); }
  else if (e.key === 'Escape') back();
  else if (state.step === 'product' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const n = curList().length; showProduct((state.pi + (e.key === 'ArrowRight' ? 1 : n - 1)) % n);
  }
});

/* ------------------------------------------------------------------ molecule jump cut */
function requestMol(on, quiet = false) {
  desiredMol = on;
  if (molBusy || on === molApplied) return;
  if (quiet) { molApplied = on; sc.setMol(on); document.body.classList.toggle('dark', on); if (on) fillMolLabels(); return; }
  molBusy = true;
  const stage = $('#stage'); stage.classList.remove('jumpcut'); void stage.offsetWidth; stage.classList.add('jumpcut');
  setTimeout(() => {
    molApplied = on; sc.setMol(on); document.body.classList.toggle('dark', on);
    if (on) fillMolLabels();
  }, 150);
  setTimeout(() => { molBusy = false; stage.classList.remove('jumpcut'); if (desiredMol !== molApplied) requestMol(desiredMol); }, 360);
}
function fillMolLabels() {
  const info = sc.getMolecules();
  $$('.mol-label').forEach((el, i) => { el.querySelector('b').textContent = info[i].name; el.querySelector('i').textContent = info[i].formula; });
}
function labels() {
  const show = molApplied && state.step === 'inside';
  $('#molUi').classList.toggle('on', show);
  if (!molApplied) return;
  $$('.mol-label').forEach((el, i) => {
    const { x, y } = sc.molScreen(i);
    el.style.transform = `translate(${x - el.offsetWidth / 2}px, ${y}px)`; el.style.opacity = clamp((reveals[i] - 0.35) / 0.65);
  });
}

/* ------------------------------------------------------------------ frame loop */
function boot() {
  resize();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now();
  let warned = false;
  const loop = (now) => {
    requestAnimationFrame(loop);
    try { frame(now); } catch (err) { if (!warned) { warned = true; console.error('frame error:', err); } }
  };
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.25); last = now;
    t2 = approach(t2, t2T, dt / 3.8);
    f = approach(f, fT, dt / 3.2);

    // hero -> category fly-through: logo lifts off, camera flies through the letters, lid opens
    const k = state.step === 'hero' || state.step === 'cats' ? 1 : 0;
    const seg = { lift: sm(t2, 0, 0.2), zoom: sm(t2, 0.1, 0.72), lid: sm(t2, 0.5, 0.8) };
    // bag finale: lid lifts, logo floats forward and settles back
    const bumpLid = Math.sin(Math.PI * sm(f, 0.1, 0.9)) * 0.8;
    const bumpLift = Math.sin(Math.PI * sm(f, 0.15, 0.95)) * 0.95;

    // See inside: lid opens, camera rises to a bird's-eye view over the tub, dives into the cream,
    // fades to black, then the molecules are introduced one at a time.
    const inside = state.step === 'inside';
    const it = inside ? (performance.now() - insideAt) / 1000 : 0;
    sc.set('bev', inside ? sm(it, 0, TL.bev) : 0);
    sc.set('dive', inside ? sm(it, TL.diveA, TL.diveB) : 0);
    sc.set('lift', Math.max(seg.lift * k, bumpLift));
    sc.set('zoom', seg.zoom * k);
    sc.set('lid', Math.max(seg.lid * k, bumpLid, inside ? sm(it, 0, 1.4) : 0));
    sc.set('fin', sm(f, 0, 0.5));
    $('#fade').style.opacity = inside ? (it < TL.swap ? sm(it, TL.fadeA, TL.swap) : 1 - sm(it, TL.swap, TL.unfade)) : 0;
    if (inside && it >= TL.swap && !molApplied) requestMol(true, true);
    reveals = [0, 1, 2].map((i) => (inside && molApplied ? easeOut(clamp((it - TL.mol0 - i * TL.gap) / TL.reveal)) : 0));
    sc.setMolReveal(reveals);
    document.body.classList.toggle('cinema', inside && it < TL.card);
    if (inside) {   // keep the bird's-eye view centred; shift the scene once the molecules appear
      const side = it > TL.swap;
      sc.set('shiftX', side && !narrow() ? 1 : 0); sc.set('shiftY', side && narrow() ? 1 : 0);
    }

    const showCats = state.step === 'cats' && t2 > 0.86;
    $('.step[data-panel="cats"]').classList.toggle('show', showCats);
    $('#cats').inert = !showCats;

    sc.setMolProgress(inside && molApplied ? clamp((it - TL.swap) / 16) : 0);
    sc.update(dt); labels();
  };
  requestAnimationFrame(loop);
  setTimeout(() => {
    document.body.classList.remove('loading');
    $('.step[data-panel="hero"]').classList.add('on');
    reduce ? sc.skipIntro() : sc.start();
  }, 350);
}
function resize() { sc.resize(window.innerWidth, window.innerHeight); updateShift(); }
window.addEventListener('resize', resize);

/* ------------------------------------------------------------------ boot */
updateBadge();
document.body.classList.add('loading');
(async () => {
  try {
    await Promise.race([
      Promise.all([600, 700, 400, 500].map((w) => document.fonts.load(`${w} 40px Montserrat`))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts optional */ }
  sc.setProduct(products[0]);
  boot();
  window.__nb = { sc, go, back, apply, get state() { return state; }, get t2() { return t2; }, get f() { return f; }, seek(t) { insideAt = performance.now() - t * 1000; } };
})();
