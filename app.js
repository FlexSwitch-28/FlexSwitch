// ============== Helpers ==============
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// ============== Cart State ==============
const CART_KEY = 'flexswitch.cart.v1';
const loadCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch { return []; }
};
const saveCart = (items) => localStorage.setItem(CART_KEY, JSON.stringify(items));

function cartCount(){ return loadCart().reduce((n,i)=> n + (i.qty||0), 0); }

// ============== Cart Drawer UI (if present) ==============
(function initCartDrawer(){
  const cartBtn = $('#cartButton');
  const cartBadge = $('#cartBadge');
  const drawer = $('#cartDrawer');
  if(!drawer || !cartBtn) return; // page without drawer

  const closeBtn = $('#closeCart');
  const scrim = drawer.querySelector('.drawer__scrim');
  const itemsEl = $('#cartItems');
  const totalEl = $('#cartTotal');
  const emptyMsg = $('#emptyMsg');

  function syncBadge(){
    const count = cartCount();
    if(!cartBadge) return;
    if(count>0){ cartBadge.hidden = false; cartBadge.textContent = String(count); }
    else { cartBadge.hidden = true; }
  }
  function render(){
    const items = loadCart();
    if(itemsEl) itemsEl.innerHTML = '';
    let total = 0;
    if(emptyMsg) emptyMsg.style.display = items.length? 'none' : 'block';
    items.forEach(item=>{
      total += (item.price||0) * (item.qty||0);
      const row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = `
        <img class="cart-item__thumb" src="${item.img||''}" alt="${item.name||'Product'}" />
        <div>
          <div style="font-weight:600">${item.name||'Product'}</div>
          <div style="opacity:.7">$${Number(item.price||0).toFixed(2)} • Size‑adaptive</div>
          <div style="display:flex; gap:8px; align-items:center; margin-top:8px">
            <button class="btn btn--ghost" aria-label="Decrease quantity" data-dec="${item.id}">−</button>
            <span aria-live="polite">${item.qty||1}</span>
            <button class="btn btn--ghost" aria-label="Increase quantity" data-inc="${item.id}">+</button>
          </div>
        </div>
        <button class="icon-btn" aria-label="Remove ${item.name||'product'}" data-remove="${item.id}">
          <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2" aria-hidden="true"><path d="M3 6h18M9 6v12m6-12v12M4 6l1 14a2 2 0 002 2h10a2 2 0 002-2l1-14M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>`;
      if(itemsEl) itemsEl.appendChild(row);
    });
    if(totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    syncBadge();
  }
  function open(){
    drawer.setAttribute('aria-hidden','false');
    cartBtn.setAttribute('aria-expanded','true');
    // Focus management for accessibility
    setTimeout(()=> closeBtn?.focus(), 20);
    render();
  }
  function close(){
    drawer.setAttribute('aria-hidden','true');
    cartBtn.setAttribute('aria-expanded','false');
    cartBtn.focus();
  }
  function modify(action, id, lastAdd){
    const items = loadCart();
    const idx = items.findIndex(i=> i.id === id);
    if(action==='add'){
      if(idx>-1) items[idx].qty++;
      else items.push({ id, name:lastAdd?.name||'Item', price:Number(lastAdd?.price)||0, qty:1, img:lastAdd?.img||'' });
    }
    if(action==='inc' && idx>-1) items[idx].qty++;
    if(action==='dec' && idx>-1){ items[idx].qty--; if(items[idx].qty<=0) items.splice(idx,1); }
    if(action==='remove' && idx>-1) items.splice(idx,1);
    saveCart(items); render();
  }

  // Events
  cartBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  scrim?.addEventListener('click', close);
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && drawer.getAttribute('aria-hidden')==='false') close(); });
  $('#cartItems')?.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-inc],[data-dec],[data-remove]');
    if(!t) return;
    if(t.dataset.inc) modify('inc', t.dataset.inc);
    if(t.dataset.dec) modify('dec', t.dataset.dec);
    if(t.dataset.remove) modify('remove', t.dataset.remove);
  });

  // Expose minimal API for other modules
  window.FlexCart = {
    add: (id, meta) => { modify('add', id, meta); open(); },
    count: cartCount,
    render,
  };

  // Initial paint
  render();
})();

// ============== Add‑to‑cart buttons (works on any page) ==============
(function initAddToCart(){
  $$("[data-add-to-cart]").forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const { id, name, price, img } = e.currentTarget.dataset;
      if(!id) return;
      if(window.FlexCart) window.FlexCart.add(id, { name, price:Number(price), img });
    });
  });
})();

// ============== Product Quick‑View Modal on products.html ==============
(function initProductModal(){
  const modal = $('#productModal');
  if(!modal) return; // not on this page
  const title = $('#modalTitle');
  const desc = $('#modalDesc');
  const price = $('#modalPrice');
  const img = $('#modalImg');
  const add = $('#modalAdd');

  // Open buttons: Use [data-open] with product data attributes on the same element or its parent
  $$("[data-open]").forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.open;
      // Prefer explicit data-* on trigger; else derive from nearest product card
      const card = btn.closest('.product');
      const name = btn.dataset.name || card?.querySelector('h2')?.textContent?.trim() || 'Flexswitch Product';
      const descText = btn.dataset.desc || card?.querySelector('p')?.textContent?.trim() || '';
      const priceVal = Number(btn.dataset.price || card?.querySelector('.price')?.textContent?.replace(/[^\d.]/g,'') || 0);
      const imgSrc = btn.dataset.img || card?.querySelector('img')?.getAttribute('src') || '';

      title.textContent = name;
      desc.textContent = descText;
      price.textContent = `$${priceVal.toFixed(2)}`;
      img.src = imgSrc;
      img.alt = name;

      add.onclick = () => { window.FlexCart?.add(id, { name, price:priceVal, img:imgSrc }); };

      // Use native <dialog> API when available
      if(typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open','');
    });
  });

  modal.querySelector('.close')?.addEventListener('click', ()=>{
    if(typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  });
})();

// ============== Footer year helper ==============
(function injectYear(){
  const y = $('#year');
  if(y) y.textContent = new Date().getFullYear();
})();