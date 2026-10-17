import './styles.css';
import { createScene } from './scene.js';
import { categories, products, byCategory, productById } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);
const sm = (v, a, b) => ease(clamp((v - a) / (b - a)));
const money = (n) => `$${n.toFixed(2).replace(/\.00$/, '')}`;

/* ------------------------------------------------------------------ cart */
let cart = {};
try { cart = JSON.parse(localStorage.getItem('nb-cart') || '{}'); } catch { cart = {}; }
Object.keys(cart).forEach((id) => { if (!productById(id)) delete cart[id]; });
const saveCart = () => { try { localStorage.setItem('nb-cart', JSON.stringify(cart)); } catch { /* private mode */ } };
const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

function renderCart() {
  const ids = Object.keys(cart);
  const list = $('#cartList'); const sum = $('#cartSum');
  const count = cartCount();
  const badge = $('#cartCount'); badge.textContent = count;
  badge.classList.add('bump'); setTimeout(() => badge.classList.remove('bump'), 260);
  if (!ids.length) {
    list.innerHTML = '<p class="cart-empty">Your bag is empty. Pick a ritual above and add a favourite — it will appear here.</p>';
    sum.innerHTML = ''; $('#checkoutBtn').disabled = true; return;
  }
  list.innerHTML = ids.map((id) => {
    const p = productById(id);
    return `<div class="cart-item" data-id="${id}">
      <div class="thumb"><i></i></div>
      <div><h4>${p.name}</h4><small>${p.size}</small>
        <div class="qty"><button data-d="-1" aria-label="Remove one">−</button><span>${cart[id]}</span><button data-d="1" aria-label="Add one">+</button></div></div>
      <div class="amt">${money(p.price * cart[id])}</div></div>`;
  }).join('');
  const subtotal = ids.reduce((a, id) => a + productById(id).price * cart[id], 0);
  const ship = subtotal >= 50 ? 0 : 5;
  sum.innerHTML = `<div><span>Subtotal</span><span>${money(subtotal)}</span></div>
    <div><span>Shipping</span><span>${ship ? money(ship) : 'Free'}</span></div>
    <div class="total"><span>Total</span><span>${money(subtotal + ship)}</span></div>`;
  $('#checkoutBtn').disabled = false;
}

$('#cartList').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-d]'); if (!b) return;
  const id = b.closest('.cart-item').dataset.id;
  cart[id] = (cart[id] || 0) + Number(b.dataset.d);
  if (cart[id] <= 0) delete cart[id];
  saveCart(); renderCart();
});
$('#checkoutBtn').addEventListener('click', () => {
  $('#cartList').innerHTML = '<div class="done"><b>Thank you — order received (mock).</b>This is a concept preview, so nothing was charged and nothing will ship. The real shop can plug into any checkout later.</div>';
  $('#cartSum').innerHTML = ''; $('#checkoutBtn').disabled = true;
  cart = {}; saveCart(); $('#cartCount').textContent = 0;
});

/* ------------------------------------------------------------------ DOM build */
const elHero = $('#hero'), elCat = $('#cat'), elProds = $('#products'), elCart = $('#cart');
let activeCategory = null;

function buildCategoryCards() {
  $('#catCards').innerHTML = categories.map((c, i) => `
    <button class="cat-card" data-cat="${c.id}">
      <div><small>0${i + 1}</small><h3>${c.name}</h3><p>${c.blurb}</p></div>
      <span class="go">Explore ${byCategory(c.id).length} →</span>
    </button>`).join('');
}

function buildCatbar() {
  $('#catbar').innerHTML = categories.map((c) => `<button data-cat="${c.id}" class="${c.id === activeCategory ? 'active' : ''}">${c.name}</button>`).join('');
}

function buildProducts(catId) {
  const list = byCategory(catId);
  elProds.innerHTML = list.map((p, i) => `
    <article class="panel" data-id="${p.id}">
      <div class="sticky">
        <div class="viewer" role="img" aria-label="${p.name}. Drag to rotate."></div>
        <aside class="card">
          <p class="idx">0${i + 1} / 0${list.length}</p>
          <h3>${p.name}</h3>
          <p class="line">${p.line}</p>
          <p class="blurb">${p.blurb}</p>
          <div class="ing">${p.ingredients.slice(0, 4).map((x) => `<span>${x}</span>`).join('')}</div>
          <div class="buy"><div class="price">${money(p.price)}<small>${p.size}</small></div>
            <button class="btn btn-solid add" data-id="${p.id}">Add to bag</button></div>
        </aside>
        <p class="hint"></p>
      </div>
    </article>`).join('');
  elProds.hidden = false;
  elProds.querySelectorAll('.viewer').forEach(bindViewer);
}

/* ------------------------------------------------------------------ 3D */
const glCanvas = $('#gl');
const sc = createScene(glCanvas);
function resize() { sc.resize(window.innerWidth, window.innerHeight); measure(); }

/* viewer drag (mouse: free tilt + spin; touch: horizontal spin, vertical still scrolls) */
function bindViewer(el) {
  let last = null;
  el.addEventListener('pointerdown', (e) => { last = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); sc.dragStart(); });
  el.addEventListener('pointermove', (e) => {
    if (!last) return;
    sc.drag(e.clientX - last.x, e.clientY - last.y, e.pointerType === 'touch');
    last = { x: e.clientX, y: e.clientY };
  });
  const end = () => { if (last) { last = null; sc.dragEnd(); } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
window.addEventListener('pointermove', (e) => sc.pointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1)), { passive: true });

/* ------------------------------------------------------------------ scroll director */
const M = { cat: { top: 0, h: 0 }, prods: { top: 0, h: 0 }, cart: { top: 0, h: 0 }, panels: [] };
function measure() {
  const y = window.scrollY;
  const r = (el) => { const b = el.getBoundingClientRect(); return { top: b.top + y, h: b.height }; };
  M.cat = r(elCat); M.cart = r(elCart); M.prods = elProds.hidden ? { top: M.cat.top + M.cat.h, h: 0 } : r(elProds);
  M.panels = [...elProds.querySelectorAll('.panel')].map(r);
}

let molApplied = false, molBusy = false, desiredMol = false, activeProduct = products[0].id;
function requestMol(on) {
  desiredMol = on;
  if (molBusy || on === molApplied) return;
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
  [...$('#molUi').querySelectorAll('.mol-label')].forEach((el, i) => {
    el.querySelector('b').textContent = info[i].name; el.querySelector('i').textContent = info[i].formula; el.querySelector('span').textContent = info[i].note;
  });
}

const narrow = () => window.innerWidth / window.innerHeight < 0.9;
let lastCardOn = null;

function direct() {
  const y = window.scrollY, vh = window.innerHeight;
  const zoneEnd = M.cat.top + M.cat.h - vh;
  const t2 = clamp(y / Math.max(zoneEnd, 1));
  const prodsOn = !elProds.hidden;

  // segment 1→2: logo lift-off, fly through letters, lid opens
  const seg = { lift: sm(t2, 0.0, 0.2), zoom: sm(t2, 0.1, 0.72), lid: sm(t2, 0.5, 0.8) };
  const pBlend = prodsOn ? sm(y, zoneEnd + vh * 0.05, zoneEnd + vh * 0.85) : 0;

  // segment 4: finale
  const f = clamp((y + vh * 0.4 - M.cart.top) / Math.max(M.cart.h - vh * 0.6, 1));
  const k = (1 - pBlend) * (1 - sm(f, 0, 0.3));
  const bumpLid = Math.sin(Math.PI * sm(f, 0.12, 0.8)) * 0.8;
  const bumpLift = Math.sin(Math.PI * sm(f, 0.2, 0.88)) * 0.95;
  sc.set('lift', Math.max(seg.lift * k, bumpLift));
  sc.set('zoom', seg.zoom * k);
  sc.set('lid', Math.max(seg.lid * k, bumpLid));
  sc.set('product', pBlend);
  sc.set('fin', sm(f, 0, 0.5));

  // product panels
  let idx = -1;
  if (prodsOn) {
    M.panels.forEach((p, i) => { if (y >= p.top - vh * 0.55) idx = i; });
  }
  const inProd = prodsOn && idx >= 0 && y < M.cart.top - vh * 0.5;
  let pt = 0;
  if (inProd) { const p = M.panels[idx]; pt = clamp((y - p.top) / Math.max(p.h - vh, 1)); }
  if (inProd) {
    const pid = elProds.querySelectorAll('.panel')[idx].dataset.id;
    if (pid !== activeProduct) { activeProduct = pid; sc.setProduct(productById(pid)); }
  }
  sc.setAutoSpin(inProd);
  requestMol(inProd && pt >= 0.46 && pt <= 0.94);

  // viewer layout shifts (desktop: scene moves right of the card; mobile: scene moves up)
  const showSide = inProd || f > 0.05;
  sc.set('shiftX', showSide && !narrow() ? 1 : 0);
  sc.set('shiftY', showSide && narrow() ? 1 : 0);

  // UI visibility
  $('.hero-copy').style.opacity = 1 - sm(t2, 0, 0.07);
  $('#scrollCue').style.opacity = 1 - sm(t2, 0, 0.04);
  const cardsOn = t2 > 0.84 && !inProd && pBlend < 0.2 && f < 0.2;
  if (cardsOn !== lastCardOn) {
    $('#catCards').classList.toggle('on', cardsOn); $('#catIntro').classList.toggle('on', cardsOn); lastCardOn = cardsOn;
  }
  $('#catbar').classList.toggle('on', inProd);
  $('#cartPanel').classList.toggle('on', f > 0.28);
  $('#molUi').classList.toggle('on', molApplied && inProd);
  const hintText = molApplied ? 'Drag to explore · Scroll to continue' : 'Drag to rotate · Scroll for the molecules';
  document.querySelectorAll('.hint').forEach((h, i) => {
    if (h.textContent !== hintText) h.textContent = hintText;
    h.style.opacity = i === idx && !molApplied ? 1 : 0;
  });
  document.querySelectorAll('.panel .card').forEach((c, i) => { c.style.opacity = i === idx && inProd ? 1 : 0; c.style.pointerEvents = i === idx && inProd ? 'auto' : 'none'; });
}

function labels() {
  if (!molApplied) return;
  const a = clamp(sc.molIn * 1.6 - 0.4);
  $('#molUi').querySelectorAll('.mol-label').forEach((el, i) => {
    const { x, y } = sc.molScreen(i);
    el.style.transform = `translate(${x - 110 * (el.offsetWidth / 220)}px, ${y}px)`;
    el.style.left = '0px'; el.style.opacity = a;
  });
}

/* ------------------------------------------------------------------ events */
$('#catCards').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]'); if (!b) return; chooseCategory(b.dataset.cat, true);
});
$('#catbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]'); if (!b || b.dataset.cat === activeCategory) return; chooseCategory(b.dataset.cat, false);
});
document.addEventListener('click', (e) => {
  const add = e.target.closest('.add');
  if (add) {
    const id = add.dataset.id; cart[id] = (cart[id] || 0) + 1; saveCart(); renderCart();
    add.classList.add('added'); add.textContent = 'Added ✓'; setTimeout(() => { add.classList.remove('added'); add.textContent = 'Add to bag'; }, 1400);
    toast(`${productById(id).name} added to your bag`);
  }
});
$('#cartBtn').addEventListener('click', () => window.scrollTo({ top: M.cart.top + M.cart.h - innerHeight, behavior: 'smooth' }));
document.querySelector('[data-go="cat"]').addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: Math.max(M.cat.top + M.cat.h - innerHeight, 0), behavior: 'smooth' }); });

function chooseCategory(id, smooth) {
  activeCategory = id; buildProducts(id); buildCatbar(); measure();
  activeProduct = ''; // force product refresh
  window.scrollTo({ top: M.prods.top, behavior: smooth ? 'smooth' : 'auto' });
}

let ticking = false;
window.addEventListener('scroll', () => { ticking = true; }, { passive: true });
window.addEventListener('resize', () => { resize(); ticking = true; });

/* ------------------------------------------------------------------ boot */
buildCategoryCards(); renderCart();
$('#cartCount').textContent = cartCount();
document.body.classList.add('loading');
window.scrollTo(0, 0); if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

(async () => {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('600 40px Montserrat'), document.fonts.load('700 40px Montserrat'), document.fonts.load('400 30px Montserrat'), document.fonts.load('500 30px Montserrat')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts optional */ }
  sc.setProduct(products[0]); activeProduct = products[0].id;
  resize();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now();
  const loop = (now) => {
    const dt = (now - last) / 1000; last = now;
    direct();
    sc.update(dt); labels();
    requestAnimationFrame(loop);
  };
  direct(); requestAnimationFrame(loop);
  setTimeout(() => { document.body.classList.remove('loading'); reduce ? sc.skipIntro() : sc.start(); }, 350);
  window.__nb = { sc, chooseCategory, direct, measure };
})();
