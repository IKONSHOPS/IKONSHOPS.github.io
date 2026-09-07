/* ============================================================
   STORE — localStorage state manager
   Checkpoint 1: initial skeleton (Cart, Wishlist, User, Orders, Coupons)
   ============================================================ */

const KEYS = {
  CART:    'vg_cart',
  WL:      'vg_wishlist',
  USER:    'vg_user',
  ORDERS:  'vg_orders',
  COUPON:  'vg_coupon',
  THEME:   'vg_theme',
};

const COUPONS = [
  { code:'FIRST100',  type:'flat',    val:500,  min:1499, label:'Flat ₹500 OFF' },
  { code:'FASHION20', type:'percent', val:20,   min:999,  label:'20% OFF'       },
  { code:'FLASH50',   type:'percent', val:50,   min:2499, label:'50% OFF MEGA'  },
];

const Store = {
  /* ---- CART ---- */
  cart()  { try{ return JSON.parse(localStorage.getItem(KEYS.CART))||[]; }catch{ return []; } },
  _saveCart(c){ localStorage.setItem(KEYS.CART, JSON.stringify(c)); window.dispatchEvent(new Event('vg:cart')); },

  addToCart(prod, size, color, qty=1){
    const c = this.cart();
    const i = c.findIndex(x => x.id===prod.id && x.size===size && x.color===color);
    if(i>-1) c[i].qty += qty;
    else c.push({ id:prod.id, title:prod.title, brand:prod.brand, price:prod.price,
                  origPrice:prod.originalPrice, gradient:prod.gradient, emoji:prod.emoji,
                  size, color, qty });
    this._saveCart(c);
  },
  updateQty(idx, qty){ const c=this.cart(); if(qty<=0) c.splice(idx,1); else c[idx].qty=qty; this._saveCart(c); },
  remove(idx){ const c=this.cart(); c.splice(idx,1); this._saveCart(c); },
  clearCart(){ this._saveCart([]); localStorage.removeItem(KEYS.COUPON); window.dispatchEvent(new Event('vg:cart')); },

  totals(){
    const c = this.cart();
    let sub=0, saved=0, items=0;
    c.forEach(x=>{ sub+=x.price*x.qty; if(x.origPrice) saved+=(x.origPrice-x.price)*x.qty; items+=x.qty; });
    const coup   = this.coupon();
    let disc = 0;
    if(coup){ disc = coup.type==='flat' ? coup.val : Math.round(sub*coup.val/100); }
    const ship   = sub>999||c.length===0 ? 0 : 99;
    return { sub, saved, disc, ship, total: Math.max(0,sub-disc+ship), items, coup };
  },

  /* ---- WISHLIST ---- */
  wl()  { try{ return JSON.parse(localStorage.getItem(KEYS.WL))||[]; }catch{ return []; } },
  toggleWL(id){
    let w=this.wl(); const i=w.indexOf(id);
    if(i>-1) w.splice(i,1); else w.push(id);
    localStorage.setItem(KEYS.WL, JSON.stringify(w));
    window.dispatchEvent(new Event('vg:wl'));
    return i===-1; // true = added
  },
  inWL(id){ return this.wl().includes(id); },

  /* ---- COUPONS ---- */
  applyCoupon(code){
    const c = COUPONS.find(x=>x.code===code.trim().toUpperCase());
    if(!c) return { ok:false, msg:'Invalid coupon code.' };
    const { sub } = this.totals();
    if(sub<c.min) return { ok:false, msg:`Min order ₹${c.min} required for ${c.code}.` };
    localStorage.setItem(KEYS.COUPON, JSON.stringify(c));
    window.dispatchEvent(new Event('vg:cart'));
    return { ok:true, msg:`${c.code} applied — ${c.label}!`, c };
  },
  coupon(){ try{ return JSON.parse(localStorage.getItem(KEYS.COUPON)); }catch{ return null; } },
  removeCoupon(){ localStorage.removeItem(KEYS.COUPON); window.dispatchEvent(new Event('vg:cart')); },

  /* ---- USER ---- */
  user(){ try{ return JSON.parse(localStorage.getItem(KEYS.USER)); }catch{ return null; } },
  login(email, name, gender = "Not Specified"){
    const u = { isLoggedIn:true, email, name, gender,
      joined: new Date().toLocaleDateString('en-IN',{month:'short',year:'numeric'}),
      address: { name, phone:'+91 98765 43210', street:'Flat 4B, Horizon Towers', city:'Mumbai', pin:'400001' }
    };
    localStorage.setItem(KEYS.USER, JSON.stringify(u));
    window.dispatchEvent(new Event('vg:user'));
    return u;
  },
  logout(){ localStorage.removeItem(KEYS.USER); window.dispatchEvent(new Event('vg:user')); },

  /* ---- ORDERS ---- */
  orders(){ try{ return JSON.parse(localStorage.getItem(KEYS.ORDERS))||[]; }catch{ return []; } },
  placeOrder(data){
    const orders = this.orders();
    const o = {
      id: 'VG-'+Math.floor(100000+Math.random()*900000),
      at: new Date().toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),
      items: data.items, totals: data.totals,
      addr: data.addr, pay: data.pay, status:'Processing'
    };
    orders.unshift(o);
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
    this.clearCart();
    return o;
  },

  /* ---- THEME ---- */
  theme(){ return localStorage.getItem(KEYS.THEME)||'dark'; },
  setTheme(t){ localStorage.setItem(KEYS.THEME,t); document.documentElement.setAttribute('data-theme',t); },
};

// Apply saved theme immediately
document.documentElement.setAttribute('data-theme', Store.theme());
