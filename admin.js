// ── Admin Dashboard Logic ──
let _qrData = {};
let _pendingLogo = '';

function qs(id) { return document.getElementById(id); }

// ── NAV ──
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    const pg = btn.dataset.page;
    document.getElementById('page-' + pg).classList.remove('hidden');
    if (pg === 'dashboard') renderDashboard();
    if (pg === 'schools') renderSchoolsPage();
    if (pg === 'orders') renderOrders();
    if (pg === 'settings') loadSettings();
  });
});

function updateBadges() {
  const d = kqLoad();
  qs('sc-badge').textContent = (d.schools||[]).length;
  qs('ord-badge').textContent = (d.orders||[]).length;
  const f = qs('ord-filter');
  if (f) f.innerHTML = '<option value="">All Schools</option>' + (d.schools||[]).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

// ── DASHBOARD ──
function renderDashboard() {
  const d = kqLoad();
  const schools = d.schools || [], orders = d.orders || [];
  const bags = totalBags(orders), rev = totalRev(orders);
  qs('stats-row').innerHTML = [
    { label: 'Schools', val: schools.length, sub: 'active programs' },
    { label: 'Total Bags', val: bags, sub: 'all schools' },
    { label: 'Total Orders', val: orders.length, sub: 'online orders' },
    { label: 'Est. Revenue', val: '$'+rev.toFixed(0), sub: 'collected by schools' },
  ].map(s => `<div class="stat-card"><div class="stat-label">${s.label}</div><div class="stat-val">${s.val}</div><div class="stat-sub">${s.sub}</div></div>`).join('');
  renderFlavorBars(qs('global-bars'), orders);
  updateBadges();
  const grid = qs('dash-grid');
  if (!schools.length) { grid.innerHTML = '<div class="empty-state">Add schools in the Schools tab →</div>'; }
  else {
    grid.innerHTML = schools.map(sc => {
      const ords = schoolOrders(orders, sc.id);
      const bags = totalBags(ords), rev = totalRev(ords), goal = sc.goal||0;
      const pct = goal ? Math.min(Math.round(bags/goal*100),100) : 0;
      const dl = deadlineInfo(sc.deadline);
      return `<div class="school-card">
        <div class="school-stripe" style="background:${sc.color||'#6B1D2E'}"></div>
        <div class="school-body">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            ${schoolLogoHtml(sc)}
            <div><div class="school-name">${sc.name}</div><div class="school-meta">${sc.contact||''}</div></div>
          </div>
          <div style="display:flex;gap:16px;margin-bottom:8px">
            <div><div class="s-num">${bags}</div><div class="s-lbl">bags</div></div>
            <div><div class="s-num">${ords.length}</div><div class="s-lbl">orders</div></div>
            ${goal?`<div><div class="s-num">${pct}%</div><div class="s-lbl">of goal</div></div>`:''}
          </div>
          ${goal?`<div class="prog-wrap"><div class="prog-fill" style="width:${pct}%;background:${sc.color||'#6B1D2E'}"></div></div>`:''}
          ${dl?`<span class="${dl.cls}" style="margin-top:6px;display:inline-block">${dl.lbl} · ${sc.deadline}</span>`:''}
        </div>
      </div>`;
    }).join('');
  }
  const footer = qs('admin-footer');
  if (footer) footer.innerHTML = kqFooterHtml();
}

// ── SCHOOLS PAGE ──
function buildPriceTable(tableId, school) {
  const el = qs(tableId); if (!el) return;
  el.innerHTML = `<tr><th>Flavor</th><th>Default Price</th><th>Your Price ($/bag)</th></tr>` +
    KQ.defaultFlavors.map(f => `
      <tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${f.color};margin-right:6px"></span>${f.name}</td>
        <td style="color:var(--muted)">$${f.price}</td>
        <td><input type="number" min="0" step="0.50" placeholder="" value="${school&&school.prices&&school.prices[f.id]!=null?school.prices[f.id]:''}" data-fid="${f.id}" style="width:80px;padding:5px 8px;font-size:13px"></td>
      </tr>`).join('');
}

function previewLogo(input) {
  if (!input.files[0]) return;
  const r = new FileReader();
  r.onload = e => {
    _pendingLogo = e.target.result;
    qs('logo-prev').innerHTML = `<img src="${e.target.result}" style="width:52px;height:52px;border-radius:50%;object-fit:cover"><div style="font-size:12px;margin-top:4px">Logo ready ✓</div>`;
  };
  r.readAsDataURL(input.files[0]);
}

function addSchool() {
  const name = qs('f-name').value.trim();
  if (!name) { toast('Please enter a school name.'); return; }
  const prices = {};
  document.querySelectorAll('#add-price-table input[data-fid]').forEach(inp => {
    if (inp.value !== '') prices[inp.dataset.fid] = parseFloat(inp.value);
  });
  const sc = {
    id: 'sc_' + Date.now(),
    name,
    contact: qs('f-contact').value.trim(),
    email: qs('f-email').value.trim(),
    phone: qs('f-phone').value.trim(),
    address: qs('f-address').value.trim(),
    deadline: qs('f-deadline').value,
    payLink: qs('f-paylink').value.trim(),
    payInstr: qs('f-payinstr').value.trim(),
    color: qs('f-color').value,
    initials: (qs('f-initials').value.trim().toUpperCase() || name.substring(0,2).toUpperCase()),
    goal: parseInt(qs('f-goal').value)||0,
    selectedFlavors: getSelectedFlavors(),
    logo: _pendingLogo,
    prices,
    key: Math.random().toString(36).substring(2,12),
  };
  const d = kqLoad();
  if (!d.schools) d.schools = [];
  d.schools.push(sc); kqSave(d);
  _pendingLogo = '';
  ['f-name','f-contact','f-email','f-phone','f-address','f-deadline','f-paylink','f-payinstr','f-initials','f-goal'].forEach(id => { const el = qs(id); if(el) el.value=''; });
  qs('logo-prev').innerHTML = '🏫 Click to upload logo';
  buildPriceTable('add-price-table', null);
  renderSchoolsPage(); updateBadges(); toast('School added! ✓');
}

function deleteSchool(sid) {
  if (!confirm('Remove this school and all its orders?')) return;
  const d = kqLoad();
  d.schools = (d.schools||[]).filter(s => s.id !== sid);
  d.orders = (d.orders||[]).filter(o => o.schoolId !== sid);
  kqSave(d); renderSchoolsPage(); renderDashboard(); updateBadges(); toast('School removed.');
}

function renderSchoolsPage() {
  buildFlavorSelector();
  buildPriceTable('add-price-table', null);
  updateBadges();
  const d = kqLoad();
  const schools = d.schools||[], orders = d.orders||[];
  const grid = qs('schools-grid');
  if (!schools.length) { grid.innerHTML = '<div class="empty-state">No schools yet.</div>'; return; }
  grid.innerHTML = schools.map(sc => {
    const ords = schoolOrders(orders, sc.id);
    const bags = totalBags(ords);
    const dl = deadlineInfo(sc.deadline);
    const flavors = getSchoolFlavors(sc);
    return `<div class="school-card">
      <div class="school-stripe" style="background:${sc.color||'#6B1D2E'}"></div>
      <div class="school-body">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          ${schoolLogoHtml(sc)}
          <div>
            <div class="school-name">${sc.name}</div>
            <div class="school-meta">${sc.email||sc.contact||''}</div>
            ${sc.phone?`<div class="school-meta">${sc.phone}</div>`:''}
            ${sc.address?`<div class="school-meta">${sc.address}</div>`:''}
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:8px">
          <div><div class="s-num">${bags}</div><div class="s-lbl">bags ordered</div></div>
          <div><div class="s-num">${ords.length}</div><div class="s-lbl">orders</div></div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
          Pricing: ${flavors.map(f=>`${f.name.split(' ')[0]} $${f.price}`).join(' · ')}
        </div>
        ${dl?`<div class="${dl.cls}" style="margin-bottom:8px">${dl.lbl} · ${sc.deadline}</div>`:''}
        <div class="school-actions">
          <button class="btn btn-sm" onclick="openQR('${sc.id}')">QR / Links</button>
          <button class="btn btn-sm btn-gold" onclick="window.open('order.html?school=${sc.id}','_blank')">Preview Order</button>
          <button class="btn btn-sm btn-outline" onclick="window.open('coord.html?school=${sc.id}&key=${sc.key}','_blank')">Coordinator View</button>
          <button class="btn btn-sm btn-red" onclick="deleteSchool('${sc.id}')">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── ORDERS ──
function renderOrders() {
  const d = kqLoad();
  const filter = qs('ord-filter')?qs('ord-filter').value:'';
  let orders = filter ? (d.orders||[]).filter(o=>o.schoolId===filter) : (d.orders||[]);
  const tbody = qs('orders-tbody');
  if (!orders.length) { tbody.innerHTML='<tr><td colspan="7"><div class="empty-state">No orders yet.</div></td></tr>'; return; }
  orders = [...orders].reverse();
  tbody.innerHTML = orders.map(o => {
    const sc = (d.schools||[]).find(s=>s.id===o.schoolId);
    const flavStr = o.flavors ? Object.entries(o.flavors).filter(([k,v])=>v>0)
      .map(([k,v])=>`${KQ.defaultFlavors.find(f=>f.id===k)?.name.split(' ')[0]||k} ×${v}`).join(', ') : '';
    return `<tr>
      <td><strong>${o.customerName}</strong><br><span style="font-size:11px;color:var(--muted)">${o.customerEmail||o.customerPhone||''}</span></td>
      <td>${sc?.name||'—'}</td>
      <td style="font-size:12px;max-width:180px">${flavStr}</td>
      <td>${o.totalBags}</td>
      <td>$${o.total.toFixed(2)}</td>
      <td style="font-size:12px">${o.receiptType||'—'}</td>
      <td style="font-size:12px;color:var(--muted)">${new Date(o.date).toLocaleDateString()}</td>
    </tr>`;
  }).join('');
}

// ── SETTINGS ──
function loadSettings() {
  const s = kqGet('settings')||{};
  qs('s-name').value = s.name||'';
  qs('s-email').value = s.email||'';
  qs('s-twilio-sid').value = s.twilioSid||'';
  qs('s-twilio-token').value = s.twilioToken||'';
  qs('s-twilio-phone').value = s.twilioPhone||'';
}
function saveSettings() {
  kqSet('settings', {
    name: qs('s-name').value.trim(),
    email: qs('s-email').value.trim(),
    twilioSid: qs('s-twilio-sid').value.trim(),
    twilioToken: qs('s-twilio-token').value.trim(),
    twilioPhone: qs('s-twilio-phone').value.trim(),
  });
  toast('Settings saved ✓');
}
function clearAll() {
  if (!confirm('Delete ALL data? Cannot be undone.')) return;
  localStorage.removeItem('kq4'); renderDashboard(); updateBadges(); toast('Cleared.');
}

// ── CSV EXPORT ──
function exportAllCSV() {
  const d = kqLoad();
  if (!(d.orders||[]).length) { toast('No orders to export.'); return; }
  const headers = ['Date','Customer','Email','Phone','Student','School','Flavors','Bags','Total','Receipt'];
  const rows = (d.orders||[]).map(o => {
    const sc = (d.schools||[]).find(s=>s.id===o.schoolId);
    const flavStr = o.flavors ? Object.entries(o.flavors).filter(([k,v])=>v>0)
      .map(([k,v])=>`${KQ.defaultFlavors.find(f=>f.id===k)?.name||k} x${v}`).join('; ') : '';
    return [new Date(o.date).toLocaleDateString(), o.customerName, o.customerEmail||'', o.customerPhone||'', o.studentName||'', sc?.name||'', flavStr, o.totalBags, o.total.toFixed(2), o.receiptType||''];
  });
  downloadCSV([headers,...rows], 'kq-orders-'+new Date().toISOString().slice(0,10)+'.csv');
  toast('Exported ✓');
}
function exportSchoolsCSV() {
  const d = kqLoad();
  if (!(d.schools||[]).length) { toast('No schools.'); return; }
  const headers = ['School','Contact','Email','Phone','Address','Deadline','Goal','Bags Ordered','Orders'];
  const rows = (d.schools||[]).map(sc => {
    const ords = schoolOrders(d.orders||[], sc.id);
    return [sc.name, sc.contact||'', sc.email||'', sc.phone||'', sc.address||'', sc.deadline||'', sc.goal||0, totalBags(ords), ords.length];
  });
  downloadCSV([headers,...rows], 'kq-schools-'+new Date().toISOString().slice(0,10)+'.csv');
  toast('Exported ✓');
}

// ── QR MODAL ──
function openQR(sid) {
  const d = kqLoad();
  const sc = (d.schools||[]).find(s=>s.id===sid); if(!sc) return;
  const base = location.href.replace(/\/[^/]*(\?.*)?$/, '/');
  const orderUrl = base + 'order.html?school=' + sid;
  const coordUrl = base + 'coord.html?school=' + sid + '&key=' + sc.key;
  qs('qr-title').textContent = sc.name;
  qs('qr-order-url').textContent = orderUrl;
  qs('qr-coord-url').textContent = coordUrl;
  qs('qr-modal').classList.remove('hidden');
  _qrData = { orderUrl, coordUrl };
  const canvas = qs('qr-canvas');
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,200,200); ctx.fillStyle='#fff'; ctx.fillRect(0,0,200,200);
  try { new QRCode(canvas, { text: orderUrl, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M }); }
  catch(e) {}
}
function closeQR() { qs('qr-modal').classList.add('hidden'); }
function copyOrder() { navigator.clipboard.writeText(_qrData.orderUrl||'').then(()=>toast('Order link copied ✓')); }
function copyCoord() { navigator.clipboard.writeText(_qrData.coordUrl||'').then(()=>toast('Coordinator link copied ✓')); }

// ── INIT ──
renderDashboard();
updateBadges();

// ── FLAVOR SELECTOR ──
function buildFlavorSelector() {
  const el = document.getElementById('flavor-selector'); if(!el) return;
  el.innerHTML = KQ.defaultFlavors.map(f => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;transition:all .15s" 
         id="fs-${f.id}" onclick="toggleFlavor('${f.id}')">
      <div style="width:10px;height:10px;border-radius:50%;background:${f.color}"></div>
      <span style="flex:1;font-weight:500">${f.name}</span>
      <span style="font-size:12px;color:var(--muted)">$${f.price}/bag</span>
      <input type="checkbox" id="fc-${f.id}" style="width:auto">
    </div>`).join('');
}

function toggleFlavor(fid) {
  const cb = document.getElementById('fc-'+fid);
  const card = document.getElementById('fs-'+fid);
  const checked = document.querySelectorAll('#flavor-selector input:checked').length;
  if (!cb.checked && checked >= 3) { alert('Maximum 3 flavors per fundraiser.'); return; }
  cb.checked = !cb.checked;
  card.style.borderColor = cb.checked ? 'var(--gold)' : 'var(--border)';
  card.style.background = cb.checked ? 'var(--cream)' : '';
}

function getSelectedFlavors() {
  return Array.from(document.querySelectorAll('#flavor-selector input:checked')).map(cb => cb.id.replace('fc-',''));
}
