/* ============================================================
   APP.JS — Checkpoint 5 (Final Production Build)
   Adds: Product Modal, Login/Register Flow, Multi-Step Checkout, Profile/Orders Dashboard
   ============================================================ */

const App = {
  view: 'home',
  heroIdx: 0,
  heroTimer: null,
  flashTimer: null,
  flashSecs: 16380, // ~4h 33m

  // Filters state
  filters: {
    cat: 'all',
    q: '',
    minPrice: 0,
    maxPrice: 15000,
    minRating: 0,
    sort: 'popular'
  },

  // Modal State Helper
  activeModalType: null, // 'product' | 'login' | 'checkout'
  selectedModalProductSize: null,

  /* ---- INIT ---- */
  init(){
    this.bindHeader();
    this.bindNav();
    this.updateBadges();
    this.go('home');
    this.startFlashTimer();

    window.addEventListener('vg:cart', () => {
      this.updateBadges();
      this.renderCartDrawer();
      if (this.view === 'cart') this.updateCartPage();
    });

    window.addEventListener('vg:wl',   () => {
      this.updateBadges();
      if (this.view === 'home') this.renderHomeProducts();
      if (this.view === 'shop') this.applyFilters();
      if (this.view === 'wishlist') this.renderWishlistPage();
    });

    window.addEventListener('vg:user', () => {
      this.updateBadges();
      if (this.view === 'profile') this.go('profile');
    });
  },

  /* ---- NAVIGATION ---- */
  go(viewName, params={}){
    this.view = viewName;

    // Reset page filters on view change unless explicitly passed
    if (viewName === 'shop') {
      if (params.cat) this.filters.cat = params.cat;
      if (params.q) {
        this.filters.q = params.q;
        document.getElementById('search-inp').value = params.q;
      }
    } else {
      this.filters.q = '';
      document.getElementById('search-inp').value = '';
    }

    // Active states — desktop nav
    document.querySelectorAll('.nav-link').forEach(el=>{
      el.classList.toggle('active', el.dataset.view===viewName);
    });
    // Active states — bottom nav
    document.querySelectorAll('.bnav-item').forEach(el=>{
      el.classList.toggle('active', el.dataset.view===viewName);
    });

    // Render requested view
    const app = document.getElementById('app');
    app.innerHTML = '';
    switch(viewName){
      case 'home':     app.innerHTML = this.renderHome();     break;
      case 'shop':     app.innerHTML = this.renderShop();     break;
      case 'wishlist': app.innerHTML = this.renderWishlist(); break;
      case 'cart':     app.innerHTML = this.renderCart();     break;
      case 'profile':  app.innerHTML = this.renderProfile();  break;
      default:         app.innerHTML = this.renderHome();
    }

    this.bindViewEvents(viewName);
    window.scrollTo({top:0, behavior:'smooth'});
  },

  /* ---- HEADER BINDINGS ---- */
  bindHeader(){
    // Theme toggle
    const btn = document.getElementById('theme-btn');
    btn.addEventListener('click', ()=>{
      const next = Store.theme()==='dark' ? 'light' : 'dark';
      Store.setTheme(next);
      document.getElementById('theme-ico').textContent = next==='dark' ? '🌙' : '☀️';
      this.toast(`Switched to ${next} mode`, 'info');
    });
    document.getElementById('theme-ico').textContent = Store.theme()==='dark' ? '🌙' : '☀️';

    // Cart drawer trigger
    document.getElementById('cart-trigger').addEventListener('click', ()=> this.openCartDrawer());

    // User button
    document.getElementById('user-btn').addEventListener('click', ()=>{
      const u = Store.user();
      if(u?.isLoggedIn) this.go('profile');
      else              this.openLoginModal();
    });

    // Search
    this.bindSearch();
  },

  /* ---- SEARCH ---- */
  bindSearch(){
    const inp  = document.getElementById('search-inp');
    const drop = document.getElementById('search-drop');

    inp.addEventListener('input', ()=>{
      const q = inp.value.trim().toLowerCase();
      if(q.length < 2){ drop.classList.remove('open'); return; }
      const hits = PRODUCTS.filter(p=>
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      ).slice(0,5);
      drop.innerHTML = hits.length
        ? hits.map(p=>`
            <div class="sdrop-item" onclick="App.handleSearchClick('${p.id}')">
              <div class="sdrop-thumb" style="background:${p.gradient}">${p.emoji}</div>
              <div>
                <div style="font-weight:700;font-size:.85rem">${p.title}</div>
                <div style="color:var(--primary);font-weight:800;font-size:.78rem">₹${p.price.toLocaleString()}</div>
              </div>
            </div>`).join('')
        : `<div style="padding:1rem;text-align:center;color:var(--text3);font-size:.85rem">No results for "${q}"</div>`;
      drop.classList.add('open');
    });

    inp.addEventListener('keydown', e=>{
      if(e.key==='Enter'){
        drop.classList.remove('open');
        this.go('shop', {q: inp.value.trim()});
        inp.blur();
      }
    });

    document.addEventListener('click', e=>{
      if(!e.target.closest('.search-wrap')) drop.classList.remove('open');
    });
  },

  handleSearchClick(productId) {
    document.getElementById('search-drop').classList.remove('open');
    this.openModal(productId);
  },

  /* ---- NAV BINDINGS ---- */
  bindNav(){
    document.querySelectorAll('[data-view]').forEach(el=>{
      el.addEventListener('click', ()=> this.go(el.dataset.view));
    });
  },

  /* ---- VIEW-SPECIFIC BINDINGS ---- */
  bindViewEvents(viewName){
    if(viewName==='home') {
      this.startHeroSlider();
      this.renderHomeProducts();
    }
    if(viewName==='shop') {
      this.applyFilters();
    }
    if(viewName==='wishlist') {
      this.renderWishlistPage();
    }
    if(viewName==='cart') {
      this.updateCartPage();
    }
  },

  /* ---- BADGE COUNTS ---- */
  updateBadges(){
    const { items } = Store.totals();
    const wl = Store.wl().length;
    document.getElementById('cart-badge').textContent = items;
    document.getElementById('wl-badge').textContent   = wl;
  },

  /* ============================================================
     VIEW RENDERERS
  ============================================================ */
  renderHome(){
    const SLIDES = [
      { grad:'linear-gradient(135deg,#0f0c29 0%,#302b63 40%,#7928ca 70%,#ff0055 100%)',
        tag:'NEW SEASON ARRIVALS', title:'NEON &amp; CYBER<br>STREETWEAR',
        sub:'Oversized hoodies, metallic cargos &amp; futuristic platforms.',
        cta:"App.go('shop')", ctaLabel:'Explore Drop →', deco:'👕 👖 🧥' },
      { grad:'linear-gradient(135deg,#0d1b2a 0%,#1b4332 40%,#7928ca 70%,#ffd700 100%)',
        tag:'IKON SHOPS PICK &amp; LUXE', title:'FESTIVE ETHNIC<br>ELEGANCE',
        sub:'Handcrafted velvets, zari embroidery &amp; organza dupattas.',
        cta:"App.go('shop',{cat:'Ethnic'})", ctaLabel:'Shop Ethnic →', deco:'👗 💎 📿' },
    ];

    const slides = SLIDES.map((s,i)=>`
      <div class="hero-slide">
        <div class="hero-bg" style="background:${s.grad}"></div>
        <div class="hero-emoji-deco">${s.deco}</div>
        <div class="hero-content">
          <span class="hero-tag">${s.tag}</span>
          <h1 class="hero-title">${s.title}</h1>
          <p class="hero-sub">${s.sub}</p>
          <button class="btn btn-primary" onclick="${s.cta}">${s.ctaLabel}</button>
        </div>
      </div>`).join('');

    const dots = SLIDES.map((_,i)=>`
      <div class="dot ${i===0?'active':''}" onclick="App.goSlide(${i})"></div>`).join('');

    // Trend bubbles
    const bubbles = CATEGORIES.map(cat=>{
      const p = PRODUCTS.find(x=>x.category===cat.id)||PRODUCTS[0];
      const grad = p ? p.gradient : 'linear-gradient(135deg,#ff0055,#7928ca)';
      return `
        <div class="bubble" onclick="App.go('shop',{cat:'${cat.id}'})">
          <div class="bubble-ring">
            <div class="bubble-inner" style="background:${grad}">${cat.emoji}</div>
          </div>
          <span class="bubble-lbl">${cat.label}</span>
        </div>`;
    }).join('');

    return `
      <!-- HERO CAROUSEL -->
      <div class="hero-section">
        <div class="hero-slider" id="hero-slider">${slides}</div>
        <div class="hero-dots">${dots}</div>
      </div>

      <!-- TREND STORIES -->
      <div class="sec-head">
        <div>
          <div class="sec-title">TREND STORIES</div>
          <div class="sec-sub">Tap a category to explore the latest drops</div>
        </div>
      </div>
      <div class="bubbles-row">${bubbles}</div>

      <!-- FLASH SALE BANNER -->
      <div class="flash-banner">
        <div class="flash-left">
          <div class="flash-icon">⚡</div>
          <div>
            <div class="flash-title">CLUB JERSEY SALE</div>
            <div class="flash-sub">Premium club jerseys up to 50% OFF, buy now!</div>
          </div>
        </div>
        <div class="countdown">
          <span style="font-size:.8rem;font-weight:600;color:var(--text2)">ENDS IN</span>
          <div class="timer-box" id="t-h">04</div><span class="timer-sep">:</span>
          <div class="timer-box" id="t-m">33</div><span class="timer-sep">:</span>
          <div class="timer-box" id="t-s">00</div>
        </div>
      </div>

      <!-- Real Product Grid -->
      <div class="sec-head" style="margin-top:2.5rem">
        <div>
          <div class="sec-title">VIRAL DROPS</div>
          <div class="sec-sub">Curated streetwear &amp; aesthetic outfits taking over social feeds</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="App.go('shop')">Explore All</button>
      </div>
      <div class="product-grid" id="home-grid"></div>

      <!-- Service perks trust bar -->
      <div class="trust-bar">
        <div class="trust-item">
          <span class="trust-emoji">🚀</span>
          <div>
            <div class="trust-title">Free Express Shipping</div>
            <div class="trust-sub">Orders above ₹999 across India</div>
          </div>
        </div>
        <div class="trust-item">
          <span class="trust-emoji">🛡️</span>
          <div>
            <div class="trust-title">100% Quality Checked</div>
            <div class="trust-sub">Guaranteed authentic fits</div>
          </div>
        </div>
        <div class="trust-item">
          <span class="trust-emoji">🔄</span>
          <div>
            <div class="trust-title">Easy 7-Day Returns</div>
            <div class="trust-sub">Doorstep exchange service</div>
          </div>
        </div>
      </div>
    `;
  },

  renderShop(){
    const catsHtml = CATEGORIES.filter(c => c.id !== 'all').map(c => `
      <label class="chk-label">
        <input type="checkbox" value="${c.id}" ${this.filters.cat === c.id ? 'checked' : ''} onchange="App.setFilterCat('${c.id}', this.checked)">
        <span>${c.label}</span>
      </label>
    `).join('');

    return `
      <div style="margin-bottom: 1.5rem;">
        <h1 class="sec-title" style="font-size: 2rem;">EXPLORE ALL DROPS</h1>
        <div class="sec-sub" id="shop-count">Showing premium fashion items</div>
      </div>

      <div class="shop-layout">
        <!-- Sidebar Filters -->
        <aside class="filter-panel">
          <div class="filter-top">
            <div style="font-weight:800; font-family:var(--ff-head);">Filters</div>
            <button style="color:var(--primary); font-size:.78rem; font-weight:700;" onclick="App.clearFilters()">Reset All</button>
          </div>

          <div class="filter-group">
            <div class="filter-label">Sort Catalog</div>
            <select class="sort-sel" id="sort-sel" onchange="App.setSort(this.value)">
              <option value="popular" ${this.filters.sort === 'popular' ? 'selected' : ''}>Popularity</option>
              <option value="low-high" ${this.filters.sort === 'low-high' ? 'selected' : ''}>Price: Low to High</option>
              <option value="high-low" ${this.filters.sort === 'high-low' ? 'selected' : ''}>Price: High to Low</option>
              <option value="discount" ${this.filters.sort === 'discount' ? 'selected' : ''}>Big Discounts</option>
            </select>
          </div>

          <div class="filter-group">
            <div class="filter-label">Category</div>
            <div style="display:flex; flex-direction:column; gap:.4rem;">
              ${catsHtml}
            </div>
          </div>

          <div class="filter-group">
            <div class="filter-label">Price Range (₹)</div>
            <div class="price-inputs">
              <input type="number" class="price-inp" id="p-min" value="${this.filters.minPrice}" onchange="App.setPriceLimit('min', this.value)">
              <span style="color:var(--text3)">-</span>
              <input type="number" class="price-inp" id="p-max" value="${this.filters.maxPrice}" onchange="App.setPriceLimit('max', this.value)">
            </div>
          </div>

          <div class="filter-group">
            <div class="filter-label">Min Rating</div>
            <div style="display:flex; flex-direction:column; gap:.4rem;">
              <label class="chk-label">
                <input type="radio" name="min-rating" value="0" ${this.filters.minRating === 0 ? 'checked' : ''} onchange="App.setRating(0)">
                <span>All Ratings</span>
              </label>
              <label class="chk-label">
                <input type="radio" name="min-rating" value="4.5" ${this.filters.minRating === 4.5 ? 'checked' : ''} onchange="App.setRating(4.5)">
                <span>4.5★ &amp; above</span>
              </label>
              <label class="chk-label">
                <input type="radio" name="min-rating" value="4.8" ${this.filters.minRating === 4.8 ? 'checked' : ''} onchange="App.setRating(4.8)">
                <span>4.8★ &amp; above</span>
              </label>
            </div>
          </div>
        </aside>

        <!-- Product Listing Grid -->
        <main>
          <div class="filter-tags" id="active-tags"></div>
          <div class="product-grid" id="shop-grid"></div>
        </main>
      </div>
    `;
  },

  renderWishlist(){
    return `
      <div style="margin-bottom: 2rem;">
        <h1 class="sec-title" style="font-size: 2rem;">MY SAVED WISHLIST ❤️</h1>
        <div class="sec-sub">Outfits you saved for later haul</div>
      </div>
      <div class="product-grid" id="wishlist-grid"></div>
    `;
  },

  renderCart(){
    return `
      <div style="margin-bottom: 2rem;">
        <h1 class="sec-title" style="font-size: 2rem;">SHOPPING BAG 🛍️</h1>
      </div>
      
      <div style="display:grid; grid-template-columns: 1fr 380px; gap: 2rem; align-items: start;" id="cart-page-layout">
        <!-- Cart Items list -->
        <div id="cart-page-items"></div>

        <!-- Summary & Coupons box -->
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:1.5rem; position:sticky; top:calc(var(--header-h) + var(--ticker-h) + 1.25rem);">
          <h3 style="font-family:var(--ff-head); font-weight:800; font-size:1.25rem; margin-bottom:1rem;">Order Summary</h3>
          
          <div style="margin-bottom:1.25rem;">
            <label style="font-size:.78rem; font-weight:700; color:var(--text2); display:block; margin-bottom:6px;">Apply Coupon</label>
            <div class="coupon-row">
              <input type="text" class="price-inp" placeholder="e.g. FIRST100" id="cart-coupon-input" style="text-transform:uppercase;">
              <button class="btn btn-secondary btn-sm" onclick="App.applyCartCoupon()">Apply</button>
            </div>
            <div id="cart-applied-coupon"></div>
          </div>

          <div style="display:flex; flex-direction:column; gap:.75rem; font-size:.9rem; border-top:1px solid var(--border); border-bottom:1px solid var(--border); padding:1rem 0; margin-bottom:1.25rem;">
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text2)">Bag Subtotal</span>
              <span id="cart-subtotal">₹0</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:var(--success);" id="cart-savings-row">
              <span>Product Savings</span>
              <span id="cart-savings">-₹0</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:var(--primary);" id="cart-discount-row">
              <span>Coupon Discount</span>
              <span id="cart-discount">-₹0</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text2)">Delivery Charges</span>
              <span id="cart-shipping">FREE</span>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; font-family:var(--ff-head); font-weight:800; font-size:1.25rem; margin-bottom:1.5rem;">
            <span>Total Payable</span>
            <span style="color:var(--primary);" id="cart-total">₹0</span>
          </div>

          <button class="btn btn-primary btn-blk" onclick="App.proceedToCheckout()">PROCEED TO CHECKOUT</button>
        </div>
      </div>
    `;
  },

  renderProfile(){
    const u = Store.user();
    const orders = Store.orders();

    if(!u || !u.isLoggedIn) {
      return `
        <div style="text-align: center; padding: 5rem 1rem; background: var(--surface); border-radius: var(--r-lg); border: 1px solid var(--border); max-width:600px; margin: 0 auto;">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;">👤</div>
          <h2 style="font-family: var(--ff-head); font-weight: 800; font-size: 1.8rem; margin-bottom: 0.5rem;">My Account</h2>
          <p style="color: var(--text2); margin-bottom: 2rem; font-size:.92rem;">Log in to view your order history, save addresses &amp; track refunds.</p>
          <button class="btn btn-primary" onclick="App.openLoginModal()">Login / Register</button>
        </div>
      `;
    }

    const ordersHtml = orders.length === 0 ? `
      <div style="background:var(--bg2); border:1px dashed var(--border); border-radius:var(--r-md); padding:3rem; text-align:center;">
        <p style="color:var(--text2); margin-bottom:1.25rem;">You haven't placed any orders yet!</p>
        <button class="btn btn-primary btn-sm" onclick="App.go('shop')">Explore Collections</button>
      </div>
    ` : orders.map(ord => `
      <div class="order-card">
        <div class="order-head">
          <div>
            <span class="order-id">${ord.id}</span>
            <span style="font-size:.78rem; color:var(--text3); margin-left:8px;">${ord.at}</span>
          </div>
          <span class="order-status">${ord.status}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:.75rem; margin-bottom:1rem;">
          ${ord.items.map(it => `
            <div class="order-item">
              <div class="order-thumb" style="background:${it.gradient};">${it.emoji}</div>
              <div>
                <h4 style="font-size:.9rem; font-weight:700;">${it.title}</h4>
                <p style="font-size:.78rem; color:var(--text2);">Size: ${it.size} | Qty: ${it.qty}</p>
              </div>
              <span style="margin-left:auto; font-weight:700; font-size:.9rem;">₹${(it.price * it.qty).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:.75rem; font-size:.85rem; color:var(--text2);">
          <span>Payment: <strong>${ord.pay}</strong></span>
          <span style="font-size:1.05rem; font-weight:800; color:var(--text);">Total: ₹${ord.totals.total.toLocaleString()}</span>
        </div>
      </div>
    `).join('');

    return `
      <div class="profile-grid">
        <!-- Sidebar Info -->
        <aside class="avatar-card">
          <div class="avatar-circle">${u.name.charAt(0).toUpperCase()}</div>
          <h3 style="font-family:var(--ff-head); font-weight:800; font-size:1.3rem;">${u.name}</h3>
          <p style="color:var(--text2); font-size:.82rem; margin-bottom:1.5rem;">${u.email} &nbsp;|&nbsp; <strong>${u.gender}</strong></p>
          
          <div style="text-align:left; background:var(--bg2); border:1px solid var(--border); padding:1rem; border-radius:var(--r-sm); margin-bottom:1.5rem; font-size:.82rem;">
            <div style="font-weight:700; color:var(--text); margin-bottom:.5rem;">Shipping Address</div>
            <div style="font-weight:600;">${u.address.name}</div>
            <div>${u.address.street}</div>
            <div>${u.address.city} - ${u.address.pin}</div>
            <div>Phone: ${u.address.phone}</div>
          </div>

          <button class="btn btn-secondary btn-blk btn-sm" onclick="Store.logout(); App.toast('Logged out successfully', 'info');">Logout</button>
        </aside>

        <!-- Orders log -->
        <main>
          <h2 style="font-family:var(--ff-head); font-weight:800; font-size:1.5rem; margin-bottom:1.25rem;">My Orders</h2>
          ${ordersHtml}
        </main>
      </div>
    `;
  },

  /* ---- CARD HTML GENERATION ---- */
  createCard(p){
    const isWl = Store.inWL(p.id);
    return `
      <div class="pcard">
        ${p.discount ? `<span class="pcard-disc">-${p.discount}%</span>` : ''}
        ${p.isFlashDeal ? `<span class="pcard-flash">⚡ FLASH</span>` : ''}
        <button class="pcard-heart ${isWl ? 'liked' : ''}" onclick="event.stopPropagation(); App.toggleWL('${p.id}')" title="Save">
          <svg width="15" height="15" fill="${isWl?'currentColor':'none'}" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </button>
        <div class="pcard-media" onclick="App.openModal('${p.id}')">
          <div class="pcard-thumb" style="background:${p.gradient}">
            ${p.image ? `<img src="${p.image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : p.emoji}
          </div>
          <div class="pcard-quick">
            ${p.sizes.map(size=>`
              <button class="qs-btn" onclick="event.stopPropagation(); App.quickAdd('${p.id}','${size}')">${size}</button>
            `).join('')}
          </div>
        </div>
        <div class="pcard-body">
          <span class="pcard-brand">${p.brand}</span>
          <h3 class="pcard-title" onclick="App.openModal('${p.id}')">${p.title}</h3>
          <div class="stars">
            ★ <span>${p.rating}</span> <span class="star-ct">(${p.reviewCount})</span>
          </div>
          <div class="price-row">
            <span class="price-now">₹${p.price.toLocaleString()}</span>
            ${p.originalPrice ? `<span class="price-was">₹${p.originalPrice.toLocaleString()}</span>` : ''}
          </div>
          <div style="margin-top:6px; display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.72rem; font-weight:700; color:${p.quantity <= 15 ? '#ff6b35' : '#22c55e'}; background:${p.quantity <= 15 ? 'rgba(255,107,53,0.12)' : 'rgba(34,197,94,0.12)'}; padding:2px 8px; border-radius:20px; letter-spacing:0.5px;">
              ${p.quantity <= 15 ? '⚡ Only ' + p.quantity + ' left' : '✅ In Stock: ' + p.quantity}
            </span>
          </div>
        </div>
      </div>
    `;
  },

  renderHomeProducts(){
    const grid = document.getElementById('home-grid');
    if(!grid) return;
    const items = PRODUCTS.slice(0, 8);
    grid.innerHTML = items.map(p => this.createCard(p)).join('');
  },

  /* ---- FILTER MECHANICS ---- */
  applyFilters(){
    const grid = document.getElementById('shop-grid');
    if(!grid) return;

    let items = PRODUCTS.filter(p => {
      if(this.filters.cat !== 'all' && p.category !== this.filters.cat) return false;
      if(this.filters.q) {
        const q = this.filters.q.toLowerCase();
        if(!p.title.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      }
      if(p.price < this.filters.minPrice || p.price > this.filters.maxPrice) return false;
      if(p.rating < this.filters.minRating) return false;
      return true;
    });

    // Sorting
    if(this.filters.sort === 'low-high') {
      items.sort((a,b) => a.price - b.price);
    } else if(this.filters.sort === 'high-low') {
      items.sort((a,b) => b.price - a.price);
    } else if(this.filters.sort === 'discount') {
      items.sort((a,b) => (b.discount||0) - (a.discount||0));
    } else {
      // popular
      items.sort((a,b) => b.rating - a.rating);
    }

    // Render count
    document.getElementById('shop-count').textContent = `Showing ${items.length} premium fashion items`;

    // Render cards
    if(items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; background: var(--surface); border-radius: var(--r-md); border:1px solid var(--border);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3 style="font-family:var(--ff-head); font-weight:800; font-size:1.3rem;">No Items Match Your Filters</h3>
          <p style="color:var(--text2); font-size:.9rem; margin-bottom:1.5rem; margin-top:.25rem;">Try modifying your price, category, or search term.</p>
          <button class="btn btn-primary btn-sm" onclick="App.clearFilters()">Reset All Filters</button>
        </div>
      `;
    } else {
      grid.innerHTML = items.map(p => this.createCard(p)).join('');
    }

    this.renderActiveTags();
  },

  renderActiveTags(){
    const tagsContainer = document.getElementById('active-tags');
    if(!tagsContainer) return;

    let tags = [];
    if(this.filters.cat !== 'all') {
      tags.push(`Category: ${this.filters.cat} <button onclick="App.setFilterCat('all', false)">&times;</button>`);
    }
    if(this.filters.q) {
      tags.push(`Search: "${this.filters.q}" <button onclick="App.removeSearchTag()">&times;</button>`);
    }
    if(this.filters.minPrice > 0 || this.filters.maxPrice < 15000) {
      tags.push(`Price: ₹${this.filters.minPrice} - ₹${this.filters.maxPrice} <button onclick="App.resetPriceFilter()">&times;</button>`);
    }
    if(this.filters.minRating > 0) {
      tags.push(`Rating: ${this.filters.minRating}★+ <button onclick="App.setRating(0)">&times;</button>`);
    }

    if(tags.length > 0) {
      tagsContainer.innerHTML = tags.map(t => `<span class="ftag">${t}</span>`).join('');
    } else {
      tagsContainer.innerHTML = '';
    }
  },

  setFilterCat(catName, checked){
    this.filters.cat = checked ? catName : 'all';
    this.go('shop');
  },
  setSort(val){
    this.filters.sort = val;
    this.applyFilters();
  },
  setPriceLimit(type, val){
    const num = Number(val) || 0;
    if(type === 'min') this.filters.minPrice = num;
    else this.filters.maxPrice = num;
    this.applyFilters();
  },
  setRating(val){
    this.filters.minRating = Number(val);
    const radios = document.getElementsByName('min-rating');
    radios.forEach(r => {
      if(Number(r.value) === this.filters.minRating) r.checked = true;
    });
    this.applyFilters();
  },
  removeSearchTag(){
    this.filters.q = '';
    document.getElementById('search-inp').value = '';
    this.applyFilters();
  },
  resetPriceFilter(){
    this.filters.minPrice = 0;
    this.filters.maxPrice = 15000;
    const minInp = document.getElementById('p-min');
    const maxInp = document.getElementById('p-max');
    if(minInp) minInp.value = 0;
    if(maxInp) maxInp.value = 10000;
    this.applyFilters();
  },
  clearFilters(){
    this.filters.cat = 'all';
    this.filters.q = '';
    this.filters.minPrice = 0;
    this.filters.maxPrice = 15000;
    this.filters.minRating = 0;
    this.filters.sort = 'popular';
    
    document.getElementById('search-inp').value = '';
    
    const minInp = document.getElementById('p-min');
    const maxInp = document.getElementById('p-max');
    if(minInp) minInp.value = 0;
    if(maxInp) maxInp.value = 10000;

    const radios = document.getElementsByName('min-rating');
    radios.forEach(r => r.checked = (Number(r.value) === 0));

    const chks = document.querySelectorAll('.filter-panel input[type="checkbox"]');
    chks.forEach(c => c.checked = false);

    const sortSel = document.getElementById('sort-sel');
    if(sortSel) sortSel.value = 'popular';

    this.applyFilters();
  },

  /* ---- WISHLIST ACTIONS ---- */
  toggleWL(id){
    const added = Store.toggleWL(id);
    const p = PRODUCTS.find(x => x.id === id);
    if(added) {
      this.toast(`Saved "${p.title}" to Wishlist! ❤️`, 'success');
    } else {
      this.toast(`Removed from Wishlist.`, 'info');
    }
  },

  renderWishlistPage(){
    const grid = document.getElementById('wishlist-grid');
    if(!grid) return;

    const savedIds = Store.wl();
    const items = PRODUCTS.filter(p => savedIds.includes(p.id));

    if(items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 5rem 1rem; background: var(--surface); border-radius: var(--r-lg); border: 1px solid var(--border);">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;">🖤</div>
          <h3 style="font-family:var(--ff-head); font-weight:800; font-size:1.5rem;">Your Wishlist is Empty</h3>
          <p style="color:var(--text2); font-size:.9rem; margin-bottom:2rem; margin-top:.25rem;">Tap the heart icon on any drop to save your favorite fits.</p>
          <button class="btn btn-primary" onclick="App.go('shop')">Browse Latest Trends</button>
        </div>
      `;
    } else {
      grid.innerHTML = items.map(p => this.createCard(p)).join('');
    }
  },

  /* ---- QUICK ADD ACTIONS ---- */
  quickAdd(productId, size){
    const p = PRODUCTS.find(x => x.id === productId);
    if(p) {
      Store.addToCart(p, size, p.colors ? p.colors[0] : null, 1);
      this.toast(`Added "${p.title}" (${size}) to Bag! 🛍️`, 'success');
    }
  },

  /* ---- DRAWER CART MECHANICS ---- */
  openCartDrawer(){
    document.getElementById('cart-drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('open');
    this.renderCartDrawer();
  },

  closeCartDrawer(){
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
  },

  renderCartDrawer(){
    const list = document.getElementById('cart-drawer-items');
    const totalLabel = document.getElementById('cart-drawer-subtotal');
    if(!list) return;

    const cart = Store.cart();
    const totals = Store.totals();
    totalLabel.textContent = `₹${totals.subtotal.toLocaleString()}`;

    if(cart.length === 0) {
      list.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem;">
          <div style="font-size:2.5rem; margin-bottom:.5rem;">🛍️</div>
          <h4 style="font-family:var(--ff-head); font-weight:700;">Your Bag is Empty</h4>
          <p style="color:var(--text2); font-size:.8rem; margin-top:.25rem;">Explore our new drops to fill it with style.</p>
        </div>
      `;
    } else {
      list.innerHTML = cart.map((item, idx)=>`
        <div class="citem">
          <div class="citem-thumb" style="background:${item.gradient}">${item.emoji}</div>
          <div class="citem-info">
            <h4 class="citem-title">${item.title}</h4>
            <div class="citem-meta">Size: ${item.size}</div>
            <div style="font-family:var(--ff-head); font-weight:800; font-size:.9rem; margin-bottom:8px;">₹${(item.price * item.qty).toLocaleString()}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto;">
              <div class="qty-ctrl">
                <button class="qty-btn" onclick="Store.updateQty(${idx}, ${item.qty - 1})">-</button>
                <span class="qty-num">${item.qty}</span>
                <button class="qty-btn" onclick="Store.updateQty(${idx}, ${item.qty + 1})">+</button>
              </div>
              <button class="remove-btn" onclick="Store.remove(${idx})">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  },

  /* ---- CART VIEW PAGE RENDERING ---- */
  updateCartPage(){
    const itemsContainer = document.getElementById('cart-page-items');
    const cartPageLayout = document.getElementById('cart-page-layout');
    if(!itemsContainer) return;

    const cart = Store.cart();
    const totals = Store.totals();

    if(cart.length === 0) {
      cartPageLayout.style.display = 'block';
      cartPageLayout.innerHTML = `
        <div style="text-align: center; padding: 5rem 1rem; background: var(--surface); border-radius: var(--r-lg); border: 1px solid var(--border);">
          <div style="font-size: 4rem; margin-bottom: 1rem;">🛒</div>
          <h2 style="font-family: var(--ff-head); font-weight: 800; font-size: 2rem;">Your Bag Feels Light</h2>
          <p style="color: var(--text2); margin-bottom: 2rem; margin-top:.25rem; font-size:.95rem;">Fill it with viral streetwear, western slip dresses &amp; ethnic kurtas.</p>
          <button class="btn btn-primary" onclick="App.go('shop')">Explore Shop</button>
        </div>
      `;
      return;
    }

    // Restore original layout if it was set to block
    cartPageLayout.style.display = 'grid';

    // Update prices
    document.getElementById('cart-subtotal').textContent = `₹${totals.subtotal.toLocaleString()}`;
    document.getElementById('cart-savings').textContent = `-₹${totals.saved.toLocaleString()}`;
    document.getElementById('cart-discount').textContent = `-₹${totals.disc.toLocaleString()}`;
    document.getElementById('cart-shipping').textContent = totals.ship === 0 ? 'FREE' : `₹${totals.ship}`;
    document.getElementById('cart-total').textContent = `₹${totals.total.toLocaleString()}`;

    // Coupon UI
    const couponInput = document.getElementById('cart-coupon-input');
    if (couponInput) {
      couponInput.value = totals.coup ? totals.coup.code : '';
    }

    const appliedPill = document.getElementById('cart-applied-coupon');
    if (totals.coup) {
      appliedPill.innerHTML = `
        <div class="coupon-tag">
          <span>Applied: <strong>${totals.coup.code}</strong> (${totals.coup.label})</span>
          <button class="coupon-rm" onclick="Store.removeCoupon()">&times;</button>
        </div>
      `;
    } else {
      appliedPill.innerHTML = '';
    }

    // Render items list
    itemsContainer.innerHTML = cart.map((item, idx) => `
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:1.25rem; margin-bottom:1rem; display:flex; gap:1.25rem;">
        <div style="width:90px; height:115px; border-radius:var(--r-sm); background:${item.gradient}; display:flex; align-items:center; justify-content:center; font-size:2.5rem; flex-shrink:0;">${item.emoji}</div>
        <div style="flex:1; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:start;">
            <div>
              <span style="font-size:.72rem; font-weight:700; color:var(--text3); text-transform:uppercase;">${item.brand}</span>
              <h3 style="font-family:var(--ff-head); font-weight:700; font-size:1.05rem; margin-top:2px;">${item.title}</h3>
            </div>
            <button style="color:var(--text3); font-size:1.5rem; cursor:pointer;" onclick="Store.remove(${idx})">&times;</button>
          </div>
          <div style="font-size:.85rem; color:var(--text2); margin-top:4px;">Size: <strong>${item.size}</strong></div>
          <div style="margin-top:auto; display:flex; align-items:center; justify-content:space-between;">
            <div class="qty-ctrl">
              <button class="qty-btn" onclick="Store.updateQty(${idx}, ${item.qty - 1})">-</button>
              <span class="qty-num">${item.qty}</span>
              <button class="qty-btn" onclick="Store.updateQty(${idx}, ${item.qty + 1})">+</button>
            </div>
            <span style="font-family:var(--ff-head); font-weight:800; font-size:1.2rem;">₹${(item.price * item.qty).toLocaleString()}</span>
          </div>
        </div>
      </div>
    `).join('');
  },

  applyCartCoupon() {
    const code = document.getElementById('cart-coupon-input').value.trim();
    if(!code) return;
    const res = Store.applyCoupon(code);
    if(res.ok) {
      this.toast(res.msg, 'success');
    } else {
      this.toast(res.msg, 'error');
    }
  },

  /* ============================================================
     CHECKPOINT 5 MODALS & DRAWERS IMPLEMENTATION
     ============================================================ */

  // Modal Open Base Helper
  openModal(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if(!product) return;
    
    this.activeModalType = 'product';
    this.selectedModalProductSize = product.sizes[0];

    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <div class="prod-detail-grid">
        <div class="detail-img" style="background:${product.gradient}; overflow:hidden;">
          ${product.image ? `<img src="${product.image}" alt="${product.title}" style="width:100%;height:100%;object-fit:cover;">` : product.emoji}
        </div>
        <div style="display:flex; flex-direction:column; justify-content:center;">
          <span style="font-size:.78rem; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:1px;">${product.brand}</span>
          <h2 style="font-family:var(--ff-head); font-weight:800; font-size:1.8rem; margin:4px 0 10px 0;">${product.title}</h2>
          
          <div class="stars" style="font-size:.9rem; margin-bottom:1rem;">
            ★ <span>${product.rating}</span>
            <span class="star-ct">(${product.reviewCount} reviews)</span>
          </div>

          <div style="display:flex; align-items:baseline; gap:12px; margin-bottom:1.25rem;">
            <span style="font-family:var(--ff-head); font-size:1.75rem; font-weight:800; color:var(--text);">₹${product.price.toLocaleString()}</span>
            ${product.originalPrice ? `<span style="font-size:1rem; color:var(--text3); text-decoration:line-through;">₹${product.originalPrice.toLocaleString()}</span>` : ''}
            ${product.discount ? `<span style="background:var(--primary-glow); color:var(--primary); font-size:.75rem; font-weight:800; padding:2px 8px; border-radius:4px; margin-left:6px;">SAVE ${product.discount}%</span>` : ''}
          </div>

          <p style="font-size:.88rem; color:var(--text2); line-height:1.6; margin-bottom:1.5rem;">${product.description}</p>

          <!-- Size Selection -->
          <div style="margin-bottom:1.5rem;">
            <label style="font-size:.82rem; font-weight:700; color:var(--text); display:block; margin-bottom:6px;">Select Size</label>
            <div class="swatch-row">
              ${product.sizes.map((s, idx) => `
                <button class="swatch ${idx === 0 ? 'on' : ''}" onclick="App.selectModalSize(this, '${s}')">${s}</button>
              `).join('')}
            </div>
          </div>

          <!-- Add / Wishlist actions -->
          <div style="display:flex; gap:1rem; margin-top:1rem;">
            <button class="btn btn-primary" style="flex:1;" onclick="App.addModalProductToCart('${product.id}')">ADD TO BAG 🛍️</button>
            <button class="btn btn-secondary" onclick="App.toggleWL('${product.id}')">❤️</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modal-overlay').classList.add('open');
  },

  selectModalSize(btn, size) {
    btn.parentElement.querySelectorAll('.swatch').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    this.selectedModalProductSize = size;
  },

  addModalProductToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if(product) {
      Store.addToCart(product, this.selectedModalProductSize, product.colors ? product.colors[0] : null, 1);
      this.closeActiveModal();
      this.toast(`Added "${product.title}" (${this.selectedModalProductSize}) to Bag!`, 'success');
      this.openCartDrawer();
    }
  },

  // Login Modal with OTP & Gender
  openLoginModal() {
    this.activeModalType = 'login';
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
      <div style="max-width:380px; margin:1rem auto; padding:1rem;" id="login-modal-wrapper">
        <h2 style="font-family:var(--ff-head); font-weight:800; font-size:1.6rem; text-align:center; margin-bottom:1.5rem;">Welcome to IKON SHOPS</h2>
        
        <form id="modal-login-form" onsubmit="App.handleModalLogin(event)">
          <div style="margin-bottom:1rem;">
            <label style="font-size:.8rem; font-weight:700; color:var(--text2); display:block; margin-bottom:6px;">Your Name</label>
            <input type="text" id="log-name" class="price-inp" placeholder="Fashion Lover" required>
          </div>
          <div style="margin-bottom:1rem;">
            <label style="font-size:.8rem; font-weight:700; color:var(--text2); display:block; margin-bottom:6px;">Email / Phone Number</label>
            <input type="text" id="log-email" class="price-inp" placeholder="name@example.com or 9876543210" required>
          </div>
          <div style="margin-bottom:1.5rem;">
            <label style="font-size:.8rem; font-weight:700; color:var(--text2); display:block; margin-bottom:6px;">Select Gender</label>
            <select id="log-gender" class="price-inp" required style="width:100%; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--bg2); color:var(--text); padding:8px 12px; font-weight:600; font-size:0.9rem;">
              <option value="" disabled selected>Choose your gender</option>
              <option value="Male">Male ♂</option>
              <option value="Female">Female ♀</option>
              <option value="Other">Other ⚧</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-blk">SEND OTP CODE 📲</button>
        </form>
      </div>
    `;

    document.getElementById('modal-overlay').classList.add('open');
  },

  handleModalLogin(e) {
    e.preventDefault();
    const name = document.getElementById('log-name').value.trim();
    const email = document.getElementById('log-email').value.trim();
    const gender = document.getElementById('log-gender').value;
    
    // Check if input is a phone number (only digits, spaces, hyphens, plus)
    const isPhone = /^[0-9\s\-+]+$/.test(email) && email.replace(/\D/g, '').length >= 10;
    const type = isPhone ? 'phone' : 'email';
    
    // Generate a random 4-digit OTP
    const generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
    this.tempLoginData = { name, email, gender, otp: generatedOTP, type };

    // Render the OTP validation screen inside the modal
    this.renderOTPVerificationScreen();
    
    // Send SMS via TextBelt or Fallback
    if (type === 'phone') {
      let cleanedPhone = email.trim();
      if (!cleanedPhone.startsWith('+')) {
        // Default to +91 (India) if no country code is specified
        cleanedPhone = '+91' + cleanedPhone.replace(/\D/g, '');
      }

      this.toast("Sending verification OTP SMS...", "info");

      fetch('https://textbelt.com/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          phone: cleanedPhone,
          message: `Your IKON SHOPS verification OTP code is: ${generatedOTP}. Valid for 3 mins.`,
          key: 'free'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.toast("💬 Real SMS OTP sent successfully to your phone!", "success");
        } else {
          this.toast("⚠️ Free SMS Limit Exceeded. Check Console (F12) for OTP!", "warning");
          console.log(`[Developer OTP Fallback] Your OTP is: ${generatedOTP}`);
        }
      })
      .catch(err => {
        this.toast("⚠️ SMS dispatch failed. Check Console (F12) for OTP!", "warning");
        console.log(`[Developer OTP Fallback] Your OTP is: ${generatedOTP}`);
      });
    } else {
      // Email fallback
      this.toast("✉️ OTP sent to email! Check Console (F12) for OTP.", "info");
      console.log(`[Developer OTP Fallback] Your OTP is: ${generatedOTP}`);
    }
  },

  renderOTPVerificationScreen() {
    const wrapper = document.getElementById('login-modal-wrapper');
    const { email, type } = this.tempLoginData;
    
    const displayMsg = type === 'phone' 
      ? `We sent a 4-digit verification code via SMS to your phone number <strong style="color:var(--text);">${email}</strong>.`
      : `We sent a 4-digit verification code via Email to <strong style="color:var(--text);">${email}</strong>.`;

    wrapper.innerHTML = `
      <h2 style="font-family:var(--ff-head); font-weight:800; font-size:1.6rem; text-align:center; margin-bottom:1rem;">OTP Verification</h2>
      <p style="font-size:0.8rem; text-align:center; color:var(--text2); margin-bottom:1.5rem; line-height:1.4;">
        ${displayMsg}
      </p>

      <form onsubmit="App.verifyLoginOTP(event)">
        <div style="margin-bottom:1.25rem;">
          <input type="text" id="otp-code-input" pattern="[0-9]{4}" maxlength="4" placeholder="Enter 4-digit OTP" required style="text-align:center; font-size:1.5rem; font-weight:800; letter-spacing:8px; padding:10px; width:100%; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--bg2); color:var(--text);">
        </div>
        <div style="font-size:0.8rem; text-align:center; color:var(--text2); margin-bottom:1.5rem;">
          Didn't receive code? Resend in <span style="color:var(--primary); font-weight:700;" id="otp-timer-display">30s</span>
          <br>
          <span style="font-size:0.72rem; color:var(--primary); text-decoration:underline; cursor:pointer; display:inline-block; margin-top:10px; font-weight:700;" onclick="App.toast('🔑 Test OTP Code is: ' + App.tempLoginData.otp, 'info')">
            ⚠️ Click here to show test OTP code
          </span>
        </div>
        <div style="display:flex; gap:1rem;">
          <button type="button" class="btn btn-secondary" onclick="App.openLoginModal()" style="flex:1;">BACK</button>
          <button type="submit" class="btn btn-primary" style="flex:2;">VERIFY & LOGIN 🎉</button>
        </div>
      </form>
    `;

    // Start 30s Countdown timer
    let timeLeft = 30;
    const timerDisp = document.getElementById('otp-timer-display');
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);


    this.otpTimerInterval = setInterval(() => {
      timeLeft--;
      if (timerDisp) timerDisp.textContent = `${timeLeft}s`;
      
      if (timeLeft <= 0) {
        clearInterval(this.otpTimerInterval);
        if (timerDisp) {
          timerDisp.innerHTML = `<span style="cursor:pointer; text-decoration:underline;" onclick="App.resendLoginOTP()">Resend OTP</span>`;
        }
      }
    }, 1000);
  },

  resendLoginOTP() {
    const newOTP = Math.floor(1000 + Math.random() * 9000).toString();
    this.tempLoginData.otp = newOTP;
    this.renderOTPVerificationScreen();
    
    const { email, type } = this.tempLoginData;

    if (type === 'phone') {
      let cleanedPhone = email.trim();
      if (!cleanedPhone.startsWith('+')) {
        cleanedPhone = '+91' + cleanedPhone.replace(/\D/g, '');
      }

      this.toast("Resending verification OTP SMS...", "info");

      fetch('https://textbelt.com/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          phone: cleanedPhone,
          message: `Your new IKON SHOPS verification OTP code is: ${newOTP}. Valid for 3 mins.`,
          key: 'free'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.toast("💬 Real SMS OTP resent successfully!", "success");
        } else {
          this.toast("⚠️ SMS Limit Exceeded. Check Console (F12) for OTP!", "warning");
          console.log(`[Developer OTP Resend Fallback] Your new OTP is: ${newOTP}`);
        }
      })
      .catch(err => {
        this.toast("⚠️ SMS dispatch failed. Check Console (F12) for OTP!", "warning");
        console.log(`[Developer OTP Resend Fallback] Your new OTP is: ${newOTP}`);
      });
    } else {
      this.toast("✉️ OTP resent to email! Check Console (F12) for OTP.", "info");
      console.log(`[Developer OTP Resend Fallback] Your new OTP is: ${newOTP}`);
    }
  },

  verifyLoginOTP(e) {
    e.preventDefault();
    const typedOTP = document.getElementById('otp-code-input').value.trim();
    
    if (typedOTP !== this.tempLoginData.otp) {
      this.toast("Invalid OTP code. Please check and try again.", "error");
      return;
    }

    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);

    const { email, name, gender } = this.tempLoginData;
    Store.login(email, name, gender);
    this.closeActiveModal();
    this.toast(`Welcome back, ${name}! ✨`, 'success');
  },

  // Checkout Modal Flow
  proceedToCheckout() {
    const u = Store.user();
    if(!u || !u.isLoggedIn) {
      this.toast('Please login to checkout.', 'info');
      this.openLoginModal();
      return;
    }

    const cart = Store.cart();
    if(cart.length === 0) {
      this.toast('Your Bag is empty!', 'error');
      return;
    }

    this.activeModalType = 'checkout';
    this.renderCheckoutStep1();
    document.getElementById('modal-overlay').classList.add('open');
  },

  renderCheckoutStep1() {
    const u = Store.user();
    const totals = Store.totals();
    const content = document.getElementById('modal-content');

    content.innerHTML = `
      <div style="padding:1rem;">
        <!-- Step timeline -->
        <div class="checkout-steps">
          <div class="step active">
            <span class="step-circle">1</span>
            <span class="step-label">Shipping</span>
          </div>
          <div class="step-line"></div>
          <div class="step">
            <span class="step-circle">2</span>
            <span class="step-label">Payment</span>
          </div>
        </div>

        <h3 style="font-family:var(--ff-head); font-weight:800; font-size:1.3rem; margin-bottom:1.25rem; border-bottom:1px solid var(--border); padding-bottom:6px;">Shipping Address</h3>
        
        <form onsubmit="App.handleCheckoutStep1Submit(event)">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
            <div style="grid-column: 1 / -1;">
              <label style="font-size:.8rem; font-weight:600; color:var(--text2);">Consignee Name</label>
              <input type="text" id="chk-name" class="price-inp" value="${u.address.name}" required style="margin-top:4px;">
            </div>
            <div>
              <label style="font-size:.8rem; font-weight:600; color:var(--text2);">Phone Number</label>
              <input type="tel" id="chk-phone" class="price-inp" value="${u.address.phone}" required style="margin-top:4px;">
            </div>
            <div>
              <label style="font-size:.8rem; font-weight:600; color:var(--text2);">Pincode</label>
              <input type="text" id="chk-pin" class="price-inp" value="${u.address.pin}" required style="margin-top:4px;">
            </div>
            <div style="grid-column: 1 / -1;">
              <label style="font-size:.8rem; font-weight:600; color:var(--text2);">Flat/Street/Landmark</label>
              <input type="text" id="chk-street" class="price-inp" value="${u.address.street}" required style="margin-top:4px;">
            </div>
            <div style="grid-column: 1 / -1;">
              <label style="font-size:.8rem; font-weight:600; color:var(--text2);">City / Town</label>
              <input type="text" id="chk-city" class="price-inp" value="${u.address.city}" required style="margin-top:4px;">
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary btn-blk">CONTINUE TO PAYMENT</button>
        </form>
      </div>
    `;
  },

  handleCheckoutStep1Submit(e) {
    e.preventDefault();
    this.checkoutData = {
      addr: {
        name: document.getElementById('chk-name').value.trim(),
        phone: document.getElementById('chk-phone').value.trim(),
        pin: document.getElementById('chk-pin').value.trim(),
        street: document.getElementById('chk-street').value.trim(),
        city: document.getElementById('chk-city').value.trim()
      }
    };
    this.renderCheckoutStep2();
  },

  renderCheckoutStep2() {
    const totals = Store.totals();
    const content = document.getElementById('modal-content');

    content.innerHTML = `
      <div style="padding:1rem;">
        <!-- Step timeline -->
        <div class="checkout-steps">
          <div class="step done">
            <span class="step-circle">1</span>
            <span class="step-label">Shipping</span>
          </div>
          <div class="step-line"></div>
          <div class="step active">
            <span class="step-circle">2</span>
            <span class="step-label">Payment</span>
          </div>
        </div>

        <h3 style="font-family:var(--ff-head); font-weight:800; font-size:1.3rem; margin-bottom:1.25rem; border-bottom:1px solid var(--border); padding-bottom:6px;">Select Payment Method</h3>
        
        <form onsubmit="App.handleCheckoutFinalSubmit(event)">
          <div style="display:flex; flex-direction:column; gap:.75rem; margin-bottom:1.5rem;">
            <label class="chk-label" style="background:var(--bg2); padding:.75rem; border:1px solid var(--border); border-radius:var(--r-sm);">
              <input type="radio" name="pay-method" value="UPI / PhonePe / GPay" checked>
              <span style="font-weight:600; margin-left:6px;">UPI (PhonePe / GPay / PayTM)</span>
            </label>
            <label class="chk-label" style="background:var(--bg2); padding:.75rem; border:1px solid var(--border); border-radius:var(--r-sm);">
              <input type="radio" name="pay-method" value="Credit / Debit Card">
              <span style="font-weight:600; margin-left:6px;">Credit / Debit Card (Visa, RuPay, MC)</span>
            </label>
            <label class="chk-label" style="background:var(--bg2); padding:.75rem; border:1px solid var(--border); border-radius:var(--r-sm);">
              <input type="radio" name="pay-method" value="Cash on Delivery">
              <span style="font-weight:600; margin-left:6px;">Cash on Delivery (COD)</span>
            </label>
          </div>

          <div style="background:var(--primary-glow); border:1px solid var(--primary); padding:1rem; border-radius:var(--r-sm); display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; font-family:var(--ff-head); font-weight:800;">
            <span>Total Payable Amount</span>
            <span style="color:var(--primary); font-size:1.25rem;">₹${totals.total.toLocaleString()}</span>
          </div>
          
          <div style="display:flex; gap:1rem;">
            <button type="button" class="btn btn-secondary" onclick="App.renderCheckoutStep1()" style="flex:1;">BACK</button>
            <button type="submit" class="btn btn-primary" style="flex:2;">PLACE ORDER NOW 🎉</button>
          </div>
        </form>
      </div>
    `;
  },

  handleCheckoutFinalSubmit(e) {
    e.preventDefault();
    const payMethod = document.querySelector('input[name="pay-method"]:checked').value;
    this.checkoutData.payMethod = payMethod;
    this.renderPaymentGateway();
  },

  // Interactive Payment Gateway Gateway
  renderPaymentGateway() {
    const totals = Store.totals();
    const content = document.getElementById('modal-content');
    const method = this.checkoutData.payMethod;

    // Generate random 4-digit code for COD captcha
    const captchaVal = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.checkoutData.currentCaptcha = captchaVal;

    content.innerHTML = `
      <div style="padding:1rem;">
        <!-- Step timeline -->
        <div class="checkout-steps">
          <div class="step done">
            <span class="step-circle">1</span>
            <span class="step-label">Shipping</span>
          </div>
          <div class="step-line"></div>
          <div class="step done">
            <span class="step-circle">2</span>
            <span class="step-label">Method</span>
          </div>
          <div class="step-line"></div>
          <div class="step active">
            <span class="step-circle">3</span>
            <span class="step-label">Payment</span>
          </div>
        </div>

        <div id="pg-main-view">
          <h3 style="font-family:var(--ff-head); font-weight:800; font-size:1.3rem; margin-bottom:1rem; text-align:center;">Secure Gateway Authorization</h3>
          <p style="font-size:0.8rem; text-align:center; color:var(--text2); margin-bottom:1.5rem;">Method: <strong>${method}</strong></p>

          ${this.getPaymentFormHTML(method, totals.total, captchaVal)}
        </div>
      </div>
    `;

    // Start payment specific JS handlers/triggers
    if (method.includes('UPI')) {
      this.startUPITimer();
    } else if (method.includes('Card')) {
      this.setupCardListeners();
    }
  },

  getPaymentFormHTML(method, amount, captchaVal) {
    if (method.includes('UPI')) {
      return `
        <div class="pg-container">
          <div class="upi-timer" id="upi-countdown">03:00</div>
          <div class="upi-qr-box" style="width:200px; height:320px; padding:4px; border:3px solid var(--primary); display:flex; align-items:center; justify-content:center;">
            <div class="upi-qr-scanner-line"></div>
            <img src="images/upi_qr.jpg" alt="Paytm UPI QR" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">
          </div>
          <p style="font-size:0.78rem; color:var(--text2); text-align:center; margin-bottom:1.25rem; max-width:280px; line-height:1.4;">
            Scan this QR code with PhonePe, GPay, Paytm or Bhim App to complete the payment of <strong>₹${amount.toLocaleString()}</strong>.
          </p>
          <form onsubmit="App.verifyUPIPayment(event)" style="width:100%; max-width:320px;">
            <div style="margin-bottom:1.25rem;">
              <label style="font-size:.75rem; font-weight:700; color:var(--text2); display:block; margin-bottom:6px;">Enter 12-digit UPI UTR / Ref Number</label>
              <input type="text" id="upi-utr" pattern="[0-9]{12}" maxlength="12" placeholder="e.g. 340912784512" class="form-control" required style="text-align:center; font-weight:800; letter-spacing:1px;">
            </div>
            <button type="submit" class="btn btn-primary btn-blk">VERIFY & CONFIRM ORDER</button>
          </form>
        </div>
      `;
    } else if (method.includes('Card')) {
      return `
        <div class="pg-container">
          <!-- Interactive Flip Card -->
          <div class="pg-card-wrapper">
            <div class="pg-card" id="pg-virtual-card">
              <!-- Front -->
              <div class="pg-card-front">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div class="pg-card-chip"></div>
                  <div class="pg-card-brand-logo" id="card-brand-logo">CARD</div>
                </div>
                <div class="pg-card-number" id="card-num-display">•••• •••• •••• ••••</div>
                <div class="pg-card-holder-group">
                  <div>
                    <div style="color:rgba(255,255,255,0.6); font-size:0.6rem; margin-bottom:2px;">CARDHOLDER</div>
                    <div class="pg-card-holder-name" id="card-holder-display">YOUR NAME</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="color:rgba(255,255,255,0.6); font-size:0.6rem; margin-bottom:2px;">EXPIRES</div>
                    <div id="card-expiry-display">MM/YY</div>
                  </div>
                </div>
              </div>
              <!-- Back -->
              <div class="pg-card-back">
                <div class="pg-card-black-bar"></div>
                <div style="margin-top:1.5rem; padding:0 1rem; color:rgba(255,255,255,0.6); font-size:0.6rem; text-align:right;">CVV / CVC</div>
                <div class="pg-card-signature-bar">
                  <span id="card-cvv-display">•••</span>
                </div>
                <div style="margin-top:1rem; padding:0 1.25rem; font-size:0.5rem; line-height:1.3; color:rgba(255,255,255,0.4);">
                  This card is mock authorized for secure e-commerce gateway testing purposes.
                </div>
              </div>
            </div>
          </div>

          <!-- Input Fields -->
          <form onsubmit="App.processCardPayment(event)" style="width:100%; max-width:320px;">
            <div style="margin-bottom:0.9rem;">
              <label style="font-size:.72rem; font-weight:700; color:var(--text2); display:block; margin-bottom:4px;">Cardholder Name</label>
              <input type="text" id="card-holder" placeholder="SUPROJIT NANDI" class="form-control" required autocomplete="off">
            </div>
            <div style="margin-bottom:0.9rem;">
              <label style="font-size:.72rem; font-weight:700; color:var(--text2); display:block; margin-bottom:4px;">Card Number</label>
              <input type="text" id="card-number" maxlength="19" placeholder="4111 2222 3333 4444" class="form-control" required autocomplete="off">
            </div>
            <div style="display:flex; gap:1rem; margin-bottom:1.5rem;">
              <div style="flex:1;">
                <label style="font-size:.72rem; font-weight:700; color:var(--text2); display:block; margin-bottom:4px;">Expiry Date</label>
                <input type="text" id="card-expiry" maxlength="5" placeholder="MM/YY" class="form-control" required autocomplete="off">
              </div>
              <div style="flex:1;">
                <label style="font-size:.72rem; font-weight:700; color:var(--text2); display:block; margin-bottom:4px;">CVV / CVC</label>
                <input type="password" id="card-cvv" maxlength="3" placeholder="123" class="form-control" required autocomplete="off">
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-blk">PAY ₹${amount.toLocaleString()} SECURELY</button>
          </form>
        </div>
      `;
    } else {
      // Cash on Delivery
      return `
        <div class="pg-container" style="max-width:320px; margin:0 auto;">
          <p style="font-size:0.8rem; color:var(--text2); text-align:center; margin-bottom:1.25rem; line-height:1.4;">
            To complete your order with <strong>Cash on Delivery (COD)</strong>, please verify you are not a robot by entering the captcha code below.
          </p>
          
          <div class="captcha-container">
            <div class="captcha-code" id="captcha-display">${captchaVal}</div>
            <button type="button" class="captcha-refresh-btn" onclick="App.refreshCaptcha()">🔄</button>
          </div>

          <form onsubmit="App.verifyCODPayment(event)" style="width:100%;">
            <div style="margin-bottom:1.5rem;">
              <label style="font-size:.72rem; font-weight:700; color:var(--text2); display:block; margin-bottom:4px;">Enter CAPTCHA Code</label>
              <input type="text" id="captcha-input" placeholder="Type letters above" class="form-control" required style="text-align:center; font-weight:800; text-transform:uppercase;">
            </div>
            <button type="submit" class="btn btn-primary btn-blk">CONFIRM & PLACE COD ORDER</button>
          </form>
        </div>
      `;
    }
  },

  // UPI Countdown timer
  startUPITimer() {
    let timeLeft = 180; // 3 minutes
    const display = document.getElementById('upi-countdown');
    
    if (this.upiInterval) clearInterval(this.upiInterval);
    
    this.upiInterval = setInterval(() => {
      let minutes = Math.floor(timeLeft / 60);
      let seconds = timeLeft % 60;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      seconds = seconds < 10 ? '0' + seconds : seconds;
      
      if (display) display.textContent = `${minutes}:${seconds}`;
      
      if (timeLeft <= 0) {
        clearInterval(this.upiInterval);
        this.toast('UPI payment window expired. Please try again.', 'error');
        this.renderCheckoutStep2();
      }
      timeLeft--;
    }, 1000);
  },

  // Credit Card formatting and flip interaction listeners
  setupCardListeners() {
    const card = document.getElementById('pg-virtual-card');
    const holderIn = document.getElementById('card-holder');
    const numberIn = document.getElementById('card-number');
    const expiryIn = document.getElementById('card-expiry');
    const cvvIn = document.getElementById('card-cvv');

    const holderDisp = document.getElementById('card-holder-display');
    const numberDisp = document.getElementById('card-num-display');
    const expiryDisp = document.getElementById('card-expiry-display');
    const cvvDisp = document.getElementById('card-cvv-display');
    const brandDisp = document.getElementById('card-brand-logo');

    // Name update
    holderIn.addEventListener('input', (e) => {
      holderDisp.textContent = e.target.value.toUpperCase() || 'YOUR NAME';
    });

    // Card number formatting and brand detection
    numberIn.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.startsWith('4')) {
        brandDisp.textContent = 'VISA';
      } else if (val.match(/^(5[1-5]|2[2-7])/)) {
        brandDisp.textContent = 'MASTERCARD';
      } else if (val.match(/^(60|65|81|82)/)) {
        brandDisp.textContent = 'RUPAY';
      } else {
        brandDisp.textContent = 'CARD';
      }

      // Group by 4 digits
      let formatted = val.match(/.{1,4}/g);
      if (formatted) {
        numberIn.value = formatted.join(' ');
        numberDisp.textContent = formatted.join(' ');
      } else {
        numberIn.value = '';
        numberDisp.textContent = '•••• •••• •••• ••••';
      }
    });

    // Expiry date formatting
    expiryIn.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length >= 2) {
        expiryIn.value = val.slice(0, 2) + '/' + val.slice(2, 4);
        expiryDisp.textContent = expiryIn.value;
      } else {
        expiryIn.value = val;
        expiryDisp.textContent = val || 'MM/YY';
      }
    });

    // CVV update
    cvvIn.addEventListener('input', (e) => {
      cvvDisp.textContent = e.target.value || '•••';
    });

    // Flip card when focusing on CVV
    cvvIn.addEventListener('focus', () => {
      card.classList.add('flipped');
    });
    cvvIn.addEventListener('blur', () => {
      card.classList.remove('flipped');
    });
  },

  // Refresh captcha button helper
  refreshCaptcha() {
    const val = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.checkoutData.currentCaptcha = val;
    const disp = document.getElementById('captcha-display');
    if (disp) disp.textContent = val;
  },

  // Simulated processing screen
  showPaymentProcessing(msg, successCallback) {
    const mainView = document.getElementById('pg-main-view');
    mainView.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:220px; padding:2rem;">
        <div style="width:40px; height:40px; border:4px solid var(--border); border-top-color:var(--primary); border-radius:50%; animation:spin 1s infinite linear; margin-bottom:1.5rem;"></div>
        <p style="font-family:var(--ff-head); font-weight:800; font-size:1.1rem; text-align:center; color:var(--text);" id="processing-msg">${msg}</p>
        <p style="font-size:0.75rem; color:var(--text2); text-align:center; margin-top:8px;">Please do not close this window or press back...</p>
      </div>
    `;

    // Process steps simulation
    setTimeout(() => {
      successCallback();
    }, 2800);
  },

  // UPI verification submit handler
  verifyUPIPayment(e) {
    e.preventDefault();
    if (this.upiInterval) clearInterval(this.upiInterval);

    this.showPaymentProcessing("Verifying UPI Transaction ID with Bank...", () => {
      this.completeOrderPlacement();
    });
  },

  // Card payment submit handler
  processCardPayment(e) {
    e.preventDefault();
    this.showPaymentProcessing("Contacting card issuer & authenticating...", () => {
      const mainView = document.getElementById('pg-main-view');
      mainView.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:220px; padding:2rem;">
          <div style="width:40px; height:40px; border:4px solid var(--border); border-top-color:var(--success); border-radius:50%; animation:spin 1s infinite linear; margin-bottom:1.5rem;"></div>
          <p style="font-family:var(--ff-head); font-weight:800; font-size:1.1rem; text-align:center; color:var(--text);">Verifying OTP Security...</p>
          <p style="font-size:0.75rem; color:var(--text2); text-align:center; margin-top:8px;">Authentication secure. Finalizing merchant settlement...</p>
        </div>
      `;

      setTimeout(() => {
        this.completeOrderPlacement();
      }, 2000);
    });
  },

  // COD captcha verification handler
  verifyCODPayment(e) {
    e.preventDefault();
    const typed = document.getElementById('captcha-input').value.toUpperCase().trim();
    if (typed !== this.checkoutData.currentCaptcha) {
      this.toast("Incorrect verification code. Please try again.", "error");
      this.refreshCaptcha();
      return;
    }

    this.showPaymentProcessing("Validating order confirmation...", () => {
      this.completeOrderPlacement();
    });
  },

  // Final success order placement
  completeOrderPlacement() {
    const cart = Store.cart();
    const totals = Store.totals();

    const order = Store.placeOrder({
      items: cart,
      totals,
      addr: this.checkoutData.addr,
      pay: this.checkoutData.payMethod
    });

    this.closeActiveModal();
    this.toast(`Payment Secure! Order placed successfully. ID: ${order.id}`, 'success');
    this.go('profile');
  },

  // Modal Closing Mechanics
  closeActiveModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.getElementById('modal-content').innerHTML = '';
    this.activeModalType = null;
  },

  handleModalOverlayClick(e) {
    if (e.target.id === 'modal-overlay') {
      this.closeActiveModal();
    }
  },

  /* ---- Hero Slider ---- */
  startHeroSlider(){
    clearInterval(this.heroTimer);
    this.heroIdx = 0;
    this.heroTimer = setInterval(()=>{
      this.heroIdx = (this.heroIdx+1) % 2;
      this.goSlide(this.heroIdx);
    }, 5500);
  },
  goSlide(i){
    this.heroIdx = i;
    const s = document.getElementById('hero-slider');
    if(s) s.style.transform = `translateX(-${i*100}%)`;
    document.querySelectorAll('.dot').forEach((d,idx)=> d.classList.toggle('active', idx===i));
  },

  /* ---- Flash Timer ---- */
  startFlashTimer(){
    clearInterval(this.flashTimer);
    this.flashTimer = setInterval(()=>{
      this.flashSecs = this.flashSecs>0 ? this.flashSecs-1 : 16380;
      const h=String(Math.floor(this.flashSecs/3600)).padStart(2,'0');
      const m=String(Math.floor((this.flashSecs%3600)/60)).padStart(2,'0');
      const s=String(this.flashSecs%60).padStart(2,'0');
      const th=document.getElementById('t-h'), tm=document.getElementById('t-m'), ts=document.getElementById('t-s');
      if(th) th.textContent=h;
      if(tm) tm.textContent=m;
      if(ts) ts.textContent=s;
    },1000);
  },

  /* ---- TOAST SYSTEM ---- */
  toast(msg, type='info'){
    const wrap = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(()=>{
      t.style.transition='opacity .35s ease,transform .35s ease';
      t.style.opacity='0'; t.style.transform='translateX(40px)';
      setTimeout(()=>t.remove(), 400);
    }, 3000);
  },
};

document.addEventListener('DOMContentLoaded', ()=> App.init());
