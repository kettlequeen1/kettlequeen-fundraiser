// ── KettleQueen Shared Data ──
const KQ = {
  contact: {
    name: 'Socorro Mercado',
    phone: '(559) 723-6484',
    email: 'info@kettlequeen.com',
    web: 'KettleQueen.com',
    webUrl: 'https://kettlequeen.com',
    tagline: 'The Snack That Loves Wine Back®',
    faith: 'Popping for the King · Jn. 3:16',
  },
  defaultFlavors: [
    { id: 'sweet-salty',  name: 'Traditional Sweet & Salty', desc: 'The classic',        price: 12, color: '#C9963A' },
    { id: 'caramel',      name: 'Caramel',                   desc: 'Rich & buttery',      price: 12, color: '#8B4513' },
    { id: 'chaat-masala', name: 'Chaat Masala',              desc: 'Globally inspired',   price: 14, color: '#E07B2A' },
    { id: 'boom',         name: 'Boom (Sweet Heat)',          desc: 'Sweet meets spicy',   price: 14, color: '#C0392B' },
    { id: 'rainbow',      name: 'Rainbow',                   desc: 'Fruity & fun',        price: 12, color: '#8E44AD' },
  ],
};

// ── Storage ──
function kqLoad() {
  try { return JSON.parse(localStorage.getItem('kq4') || '{}'); } catch(e) { return {}; }
}
function kqSave(data) {
  try { localStorage.setItem('kq4', JSON.stringify(data)); } catch(e) {}
}
function kqGet(key) {
  const d = kqLoad(); return d[key];
}
function kqSet(key, val) {
  const d = kqLoad(); d[key] = val; kqSave(d);
}

// ── Helpers ──
function getParam(k) { return new URLSearchParams(location.search).get(k); }
function toast(msg, duration=2800) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), duration);
}
function deadlineInfo(d) {
  if (!d) return null;
  const diff = Math.round((new Date(d) - new Date()) / 86400000);
  return {
    cls: diff < 0 ? 'dl-past' : diff < 7 ? 'dl-soon' : 'dl-ok',
    lbl: diff < 0 ? 'Ended' : diff === 0 ? 'Ends today!' : diff + 'd left',
  };
}
function schoolLogoHtml(sc, size=44) {
  if (sc.logo) return `<img src="${sc.logo}" class="school-logo-circle" style="width:${size}px;height:${size}px" alt="${sc.name}">`;
  return `<div class="school-initials" style="width:${size}px;height:${size}px;background:${sc.color||'#6B1D2E'};font-size:${Math.round(size*.3)}px">${sc.initials||'??'}</div>`;
}
function kqFooterHtml() {
  const logo = typeof window.KQ_LOGO !== 'undefined' ? `<img src="${window.KQ_LOGO}" alt="KettleQueen">` : '';
  return `<div class="kq-footer">
    ${logo}
    <div class="kq-footer-name">KettleQueen® Artisan Kettlecorn</div>
    <div class="kq-footer-tag">${KQ.contact.tagline}</div>
    <div class="kq-footer-tag">${KQ.contact.faith}</div>
    <div class="kq-footer-contact">
      <a href="tel:5597236484">${KQ.contact.phone}</a> &nbsp;·&nbsp;
      <a href="mailto:${KQ.contact.email}">${KQ.contact.email}</a> &nbsp;·&nbsp;
      <a href="${KQ.contact.webUrl}" target="_blank">${KQ.contact.web}</a>
    </div>
  </div>`;
}
function getSchoolFlavors(sc) {
  // merge default flavors with school's custom prices
  return KQ.defaultFlavors.map(f => ({
    ...f,
    price: (sc.prices && sc.prices[f.id] != null) ? sc.prices[f.id] : f.price,
  }));
}
function schoolOrders(orders, sid) { return orders.filter(o => o.schoolId === sid); }
function totalBags(orders) { return orders.reduce((s,o) => s + o.totalBags, 0); }
function totalRev(orders) { return orders.reduce((s,o) => s + o.total, 0); }
function flavorTotals(orders) {
  const t = {}; KQ.defaultFlavors.forEach(f => t[f.id] = 0);
  orders.forEach(o => { if (o.flavors) Object.entries(o.flavors).forEach(([k,v]) => { t[k] = (t[k]||0)+v; }); });
  return t;
}
function renderFlavorBars(el, orders) {
  const totals = flavorTotals(orders);
  const max = Math.max(...Object.values(totals), 1);
  const sum = Object.values(totals).reduce((a,b)=>a+b,0);
  if (!sum) { el.innerHTML = '<div class="empty-state" style="padding:.5rem">No orders yet</div>'; return; }
  el.innerHTML = KQ.defaultFlavors.map(f => `
    <div class="flavor-row">
      <span class="flavor-label">${f.name}</span>
      <div class="flavor-bar-wrap"><div class="flavor-bar-fill" style="width:${Math.round(totals[f.id]/max*100)}%;background:${f.color}"></div></div>
      <span class="flavor-count">${totals[f.id]}</span>
    </div>`).join('');
}
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = filename; a.click();
}
