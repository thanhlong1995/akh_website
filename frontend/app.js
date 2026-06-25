// Đổi thành Railway URL khi deploy
const API_BASE = 'http://localhost:8000';

// ── Utilities ──────────────────────────────────────────────────────────────

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function formatDate(d = new Date()) {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
}

function statusBadge(status) {
  const map = {
    xu_ly:     ['badge-blue',  'Xử lý'],
    dang_giao: ['badge-amber', 'Đang giao'],
    da_giao:   ['badge-green', 'Đã giao'],
    huy:       ['badge-red',   'Huỷ'],
  };
  const [cls, label] = map[status] ?? ['badge-blue', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function categoryLabel(cat) {
  return { mon_an: 'Món ăn', mon_nuoc: 'Món nước', bia_nuoc_ngot: 'Bia & Nước ngọt' }[cat] ?? cat;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Bar chart (pure SVG) ───────────────────────────────────────────────────

function createBarChart(data, { color = '#185FA5', labelColor = '#6B7280' } = {}) {
  const W = 600, H = 160, PAD_B = 28, PAD_T = 8;
  const drawH = H - PAD_B - PAD_T;
  const max = Math.max(...data.map(d => d.value), 1);
  const slotW = W / data.length;
  const barW = Math.max(slotW * 0.55, 12);

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.cssText = 'width:100%;height:100%;display:block';

  data.forEach((d, i) => {
    const barH = Math.max(Math.round((d.value / max) * drawH), d.value > 0 ? 2 : 0);
    const x = i * slotW + (slotW - barW) / 2;
    const y = PAD_T + drawH - barH;

    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y);
    rect.setAttribute('width', barW); rect.setAttribute('height', barH);
    rect.setAttribute('rx', 4); rect.setAttribute('fill', color);
    svg.appendChild(rect);

    const txt = document.createElementNS(ns, 'text');
    txt.setAttribute('x', x + barW / 2); txt.setAttribute('y', H - 6);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('font-size', '11'); txt.setAttribute('fill', labelColor);
    txt.textContent = d.label;
    svg.appendChild(txt);
  });

  return svg;
}

// ── Auth ───────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'akh_token';

function getToken()   { return sessionStorage.getItem(TOKEN_KEY); }
function isLoggedIn() { return !!getToken(); }

function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
}
function hideLoginPage() {
  document.getElementById('login-page').style.display = 'none';
}

// ── API helper ─────────────────────────────────────────────────────────────

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    showLoginPage();
    throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Lỗi ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// ── Router ─────────────────────────────────────────────────────────────────

const PAGE_CONFIG = {
  dashboard: { title: 'Tổng quan',    action: null },
  orders:    { title: 'Tạo đơn hàng', action: null },
  products:  { title: 'Sản phẩm',     action: { label: '+ Thêm món', fn: () => openProductForm() } },
  report:    { title: 'Báo cáo',      action: null },
};

const RENDERERS = {
  dashboard: renderDashboard,
  orders:    renderOrders,
  products:  renderProducts,
  report:    renderReport,
};

function navigate() {
  const page = location.hash.replace('#', '') || 'dashboard';
  const cfg = PAGE_CONFIG[page] ?? PAGE_CONFIG.dashboard;

  // Sidebar active
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  // Topbar title & button
  document.getElementById('page-title').textContent = cfg.title;
  const btn = document.getElementById('topbar-btn');
  if (cfg.action) {
    btn.textContent = cfg.action.label;
    btn.onclick = cfg.action.fn;
    btn.style.display = '';
  } else {
    btn.style.display = 'none';
  }

  // Render page content
  const render = RENDERERS[page] ?? RENDERERS.dashboard;
  const contentEl = document.getElementById('content');
  contentEl.innerHTML = '<div class="loading-screen">Đang tải...</div>';
  render().catch(err => {
    const div = document.createElement('div');
    div.className = 'error-state';
    div.textContent = `Không thể tải dữ liệu: ${err.message}`;
    contentEl.replaceChildren(div);
  });
}

// ── Page: Tổng quan ────────────────────────────────────────────────────────

async function renderDashboard() {
  const [stats, chart] = await Promise.all([
    api('/dashboard/stats'),
    api('/dashboard/revenue-chart'),
  ]);

  const recentOrders = await api('/orders/recent');

  const deltaHtml = (v, unit = '') => {
    if (v === 0) return `<span class="metric-delta">— so với hôm qua</span>`;
    const cls = v > 0 ? 'up' : 'down';
    const arrow = v > 0 ? '↑' : '↓';
    return `<span class="metric-delta ${cls}">${arrow} ${Math.abs(v)}${unit} so với hôm qua</span>`;
  };

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="card-grid">
      <div class="metric-card">
        <div class="metric-label">Doanh thu hôm nay</div>
        <div class="metric-value">${formatCurrency(stats.revenue_today)}</div>
        ${deltaHtml(stats.revenue_delta, '%')}
      </div>
      <div class="metric-card">
        <div class="metric-label">Đơn hàng mới</div>
        <div class="metric-value">${stats.new_orders}</div>
        ${deltaHtml(stats.orders_delta)}
      </div>
      <div class="metric-card">
        <div class="metric-label">Tổng sản phẩm</div>
        <div class="metric-value">${stats.total_products}</div>
        <span class="metric-delta">trong thực đơn</span>
      </div>
      <div class="metric-card">
        <div class="metric-label">Khách hàng mới</div>
        <div class="metric-value">${stats.new_customers}</div>
        ${deltaHtml(stats.customers_delta)}
      </div>
    </div>

    <div class="two-col">
      <div class="section-card">
        <div class="section-title">Doanh thu 7 ngày</div>
        <div class="chart-wrap" id="revenue-chart"></div>
      </div>
      <div class="section-card">
        <div class="section-title">Đơn hàng gần đây</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Mã đơn</th><th>Khách</th><th>Tổng</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              ${recentOrders.length ? recentOrders.map(o => `
                <tr>
                  <td>#${o.id}</td>
                  <td>${escapeHtml(o.customer_name) || '—'}</td>
                  <td>${formatCurrency(o.total_amount)}</td>
                  <td>${statusBadge(o.status)}</td>
                </tr>`).join('') : '<tr><td colspan="4" class="empty-state">Chưa có đơn hàng</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Vẽ biểu đồ
  const chartData = chart.map(p => ({
    label: new Date(p.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    value: p.revenue,
  }));
  document.getElementById('revenue-chart').appendChild(createBarChart(chartData));
}

// ── Page: Tạo đơn hàng ────────────────────────────────────────────────────

let orderItems = [];   // { product, quantity }
let allProducts = [];

async function renderOrders() {
  orderItems = [];
  allProducts = await api('/products');
  drawOrderPage();
}

function drawOrderPage() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="section-card" style="max-width:680px">

      <div class="form-field" style="margin-bottom:16px">
        <label>Khách hàng (tuỳ chọn)</label>
        <input id="order-customer" type="text" placeholder="Tên hoặc số điện thoại khách hàng" style="max-width:360px"/>
      </div>

      <div class="form-field" style="margin-bottom:16px;position:relative">
        <label>Tìm món</label>
        <div class="search-wrap">
          <input id="product-search" type="text" placeholder="Nhập tên món ăn / đồ uống..." style="width:100%"/>
          <div class="search-results" id="search-results" style="display:none"></div>
        </div>
      </div>

      <div id="order-items-list"></div>

      <div class="order-summary" id="order-summary" style="display:none">
        <div class="summary-row"><span>Tạm tính</span><span id="subtotal"></span></div>
        <div class="summary-row total"><span>Tổng cộng</span><span id="total"></span></div>
      </div>

      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
      <button class="btn btn-primary" style="width:40%" id="submit-order" disabled>
        Tạo đơn hàng
      </button>
      <button class="btn btn-secondary" style="width:40%" id="print-order" disabled>
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
          <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        In phiếu đơn hàng
      </button>
      </div>
    </div>
  `;

  document.getElementById('product-search').addEventListener('input', onProductSearch);
  document.getElementById('submit-order').addEventListener('click', submitOrder);
  document.getElementById('print-order').addEventListener('click', printOrder);
  document.addEventListener('click', closeSearchOnOutside);
  renderOrderItems();
}

function onProductSearch(e) {
  const q = e.target.value.trim().toLowerCase();
  const box = document.getElementById('search-results');
  if (!q) { box.style.display = 'none'; return; }

  const matches = allProducts.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
  if (!matches.length) { box.style.display = 'none'; return; }

  box.innerHTML = matches.map(p => `
    <div class="search-result-item" data-id="${p.id}">
      <span>${escapeHtml(p.name)} <small style="color:var(--gray-400)">${escapeHtml(categoryLabel(p.category))}</small></span>
      <span style="color:var(--gray-600)">${formatCurrency(p.price)}/${escapeHtml(p.unit)}</span>
    </div>`).join('');
  box.style.display = '';

  box.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => {
      const product = allProducts.find(p => p.id === +el.dataset.id);
      addToOrder(product);
      document.getElementById('product-search').value = '';
      box.style.display = 'none';
    });
  });
}

function closeSearchOnOutside(e) {
  if (!e.target.closest('.search-wrap')) {
    const box = document.getElementById('search-results');
    if (box) box.style.display = 'none';
  }
}

function addToOrder(product) {
  const existing = orderItems.find(i => i.product.id === product.id);
  if (existing) {
    existing.quantity = +(existing.quantity + (product.unit === 'kg' ? 0.1 : 1)).toFixed(1);
  } else {
    orderItems.push({ product, quantity: product.unit === 'kg' ? 0.1 : 1 });
  }
  renderOrderItems();
}

function changeQty(productId, delta) {
  const item = orderItems.find(i => i.product.id === productId);
  if (!item) return;
  const step = item.product.unit === 'kg' ? 0.1 : 1;
  item.quantity = +(item.quantity + delta * step).toFixed(1);
  if (item.quantity <= 0) orderItems = orderItems.filter(i => i.product.id !== productId);
  renderOrderItems();
}

function renderOrderItems() {
  const list = document.getElementById('order-items-list');
  const summary = document.getElementById('order-summary');
  const btn = document.getElementById('submit-order');
  const printBtn = document.getElementById('print-order');
  if (!list) return;

  if (!orderItems.length) {
    list.innerHTML = '<div class="empty-state" style="padding:32px 0">Chưa có món nào trong đơn</div>';
    summary.style.display = 'none';
    btn.disabled = true;
    if (printBtn) printBtn.disabled = true;
    return;
  }

  list.innerHTML = `
    <div class="order-items">
      ${orderItems.map(({ product: p, quantity: q }) => `
        <div class="order-item-row">
          <span class="order-item-name">${escapeHtml(p.name)}</span>
          <div class="item-controls">
            <div class="qty-ctrl">
              <button class="qty-btn" data-action="dec" data-id="${p.id}">−</button>
              <input class="qty-value" type="number" value="${q}" min="0.1" step="0.1" data-id="${p.id}"/>
              <button class="qty-btn" data-action="inc" data-id="${p.id}">+</button>
            </div>
            <small style="color:var(--gray-400)">${escapeHtml(p.unit)}</small>
            <span class="order-item-price">${formatCurrency(p.price * q)}</span>
          </div>
          <button class="btn-icon" data-action="remove" data-id="${p.id}" title="Xoá">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>`).join('')}
    </div>`;

  // Event delegation — tránh inline onclick nhận data từ server
  const orderItemsEl = list.querySelector('.order-items');
  orderItemsEl?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = +btn.dataset.id;
    if (btn.dataset.action === 'inc')    changeQty(id, 1);
    if (btn.dataset.action === 'dec')    changeQty(id, -1);
    if (btn.dataset.action === 'remove') { orderItems = orderItems.filter(i => i.product.id !== id); renderOrderItems(); }
  });
  orderItemsEl?.addEventListener('change', e => {
    const input = e.target.closest('input.qty-value');
    if (!input) return;
    const id   = +input.dataset.id;
    const val  = parseFloat(input.value);
    const item = orderItems.find(i => i.product.id === id);
    if (!item) return;
    if (isNaN(val) || val <= 0) { input.value = item.quantity; return; }
    item.quantity = parseFloat(val.toFixed(2));
    renderOrderItems();
  });

  const total = orderItems.reduce((s, { product: p, quantity: q }) => s + p.price * q, 0);
  document.getElementById('subtotal').textContent = formatCurrency(total);
  document.getElementById('total').textContent    = formatCurrency(total);
  summary.style.display = '';
  btn.disabled = false;
  if (printBtn) printBtn.disabled = false;
}

async function submitOrder() {
  const customerInput = document.getElementById('order-customer').value.trim();
  const btn = document.getElementById('submit-order');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';

  try {
    let customerId = null;
    if (customerInput) {
      const customers = await api(`/customers?search=${encodeURIComponent(customerInput)}`);
      if (customers.length) {
        customerId = customers[0].id;
      } else {
        const created = await api('/customers', {
          method: 'POST',
          body: { name: customerInput },
        });
        customerId = created.id;
      }
    }

    await api('/orders', {
      method: 'POST',
      body: {
        customer_id: customerId,
        items: orderItems.map(({ product, quantity }) => ({
          product_id: product.id,
          quantity,
        })),
      },
    });

    orderItems = [];
    drawOrderPage();
    showToast('Đã tạo đơn hàng thành công');
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, true);
    btn.disabled = false;
    btn.textContent = 'Tạo đơn hàng';
  }
}

// ── Print order ────────────────────────────────────────────────────────────

function printOrder() {
  const pw = Math.round(window.screen.width * 0.8);
  const ph = Math.round(window.screen.height * 0.8);
  const pl = Math.round((window.screen.width - pw) / 2);
  const pt = Math.round((window.screen.height - ph) / 2);
  const w = window.open('', '_blank', `width=${pw},height=${ph},left=${pl},top=${pt}`);
  if (!w) {
    showToast('Trình duyệt đang chặn popup. Vui lòng cho phép popup để in.', true);
    return;
  }

  const customerRaw = document.getElementById('order-customer')?.value.trim() ?? '';
  const now   = new Date();
  const total = orderItems.reduce((s, { product: p, quantity: q }) => s + p.price * q, 0);
  const doc   = w.document;

  // ── Meta + styles ──────────────────────────────
  doc.documentElement.lang = 'vi';
  doc.title = 'Phiếu đơn hàng — AKH Quán';

  const meta = doc.createElement('meta');
  meta.setAttribute('charset', 'UTF-8');
  doc.head.appendChild(meta);

  const style = doc.createElement('style');
  style.textContent = [
    '*{margin:0;padding:0;box-sizing:border-box}',
    "body{font-family:'Courier New',monospace;font-size:13px;padding:24px;max-width:400px;margin:0 auto}",
    'h1{text-align:center;font-size:20px;letter-spacing:3px;margin-bottom:4px}',
    '.sub{text-align:center;font-size:11px;color:#555;margin-bottom:12px}',
    'hr{border:none;border-top:1px dashed #777;margin:10px 0}',
    'table{width:100%;border-collapse:collapse}',
    'td{padding:3px 2px;font-size:13px;vertical-align:top}',
    '.info td:first-child{color:#555;white-space:nowrap;padding-right:8px}',
    '.items th{font-size:11px;border-bottom:1px dashed #777;padding:4px 2px;text-align:left}',
    '.r{text-align:right}',
    '.total-row td{font-weight:bold;font-size:15px;padding-top:8px;border-top:1px dashed #777}',
    '.footer{text-align:center;margin-top:14px;font-size:12px;color:#444}',
    '@media print{@page{margin:10mm}body{padding:0}}',
  ].join('');
  doc.head.appendChild(style);

  // ── Helpers ────────────────────────────────────
  const b = doc.body;
  const mk = (tag, cls) => { const e = doc.createElement(tag); if (cls) e.className = cls; return e; };
  const tx = (tag, text, cls) => { const e = mk(tag, cls); e.textContent = text; return e; };
  const hr = () => doc.createElement('hr');
  const td = (text, cls) => { const e = mk('td', cls); e.textContent = text; return e; };
  const addRow = (table, cells) => {
    const row = doc.createElement('tr');
    cells.forEach(c => row.appendChild(c));
    table.appendChild(row);
  };

  // ── Header ─────────────────────────────────────
  b.appendChild(tx('h1', 'AKH SHOP'));
  b.appendChild(tx('p', 'Phiếu đặt món', 'sub'));
  b.appendChild(hr());

  // ── Info ───────────────────────────────────────
  const infoTable = mk('table', 'info');
  const dateVal = `${now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  addRow(infoTable, [td('Ngày in:'), td(dateVal)]);
  if (customerRaw) addRow(infoTable, [td('Khách hàng:'), td(customerRaw)]);
  b.appendChild(infoTable);
  b.appendChild(hr());

  // ── Items table ────────────────────────────────
  const itemsTable = mk('table', 'items');
  const thead = doc.createElement('thead');
  const hRow  = doc.createElement('tr');
  ['#', 'Món', 'SL', 'Đơn giá', 'T.tiền'].forEach((h, i) => {
    hRow.appendChild(tx('th', h, i >= 2 ? 'r' : ''));
  });
  thead.appendChild(hRow);
  itemsTable.appendChild(thead);

  const tbody = doc.createElement('tbody');
  orderItems.forEach(({ product: p, quantity: q }, i) => {
    addRow(tbody, [
      td(String(i + 1)),
      td(p.name),
      td(`${q} ${p.unit}`, 'r'),
      td(formatCurrency(p.price), 'r'),
      td(formatCurrency(p.price * q), 'r'),
    ]);
  });
  itemsTable.appendChild(tbody);
  b.appendChild(itemsTable);

  // ── Total ──────────────────────────────────────
  const totalTable = mk('table');
  totalTable.style.marginTop = '8px';
  const totalTd = td(formatCurrency(total), 'r');
  totalTd.style.textAlign = 'right';
  addRow(totalTable, [td('TỔNG CỘNG', 'total-row'), totalTd]);
  b.appendChild(totalTable);
  b.appendChild(hr());

  // ── Footer ─────────────────────────────────────
  b.appendChild(tx('p', '— Cảm ơn quý khách! —', 'footer'));

  w.focus();
  w.print();
  w.addEventListener('afterprint', () => w.close());
}

// ── Page: Sản phẩm ─────────────────────────────────────────────────────────

let productFormOpen = false;
let editingProduct  = null;

async function renderProducts() {
  productFormOpen = false;
  editingProduct  = null;
  await drawProductsPage();
}

async function drawProductsPage(search = '', category = '') {
  let url = '/products';
  const params = new URLSearchParams();
  if (search)   params.set('search',   search);
  if (category) params.set('category', category);
  if ([...params].length) url += '?' + params;

  const products = await api(url);
  const content  = document.getElementById('content');

  content.innerHTML = `
    <div class="section-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <input id="p-search" type="text" placeholder="Tìm tên món..." value="${escapeHtml(search)}" style="min-width:200px"/>
          <select id="p-category">
            <option value="">Tất cả</option>
            <option value="mon_an"        ${category === 'mon_an'        ? 'selected' : ''}>Món ăn</option>
            <option value="mon_nuoc"      ${category === 'mon_nuoc'      ? 'selected' : ''}>Món nước</option>
            <option value="bia_nuoc_ngot" ${category === 'bia_nuoc_ngot' ? 'selected' : ''}>Bia & Nước ngọt</option>
          </select>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Tên món</th><th>Danh mục</th><th>Đơn vị</th><th>Giá bán</th><th></th></tr>
          </thead>
          <tbody>
            ${products.length ? products.map(p => `
              <tr>
                <td style="font-weight:500">${escapeHtml(p.name)}</td>
                <td>${escapeHtml(categoryLabel(p.category))}</td>
                <td>${escapeHtml(p.unit)}</td>
                <td>${formatCurrency(p.price)}</td>
                <td style="text-align:right">
                  <button class="btn-icon" title="Sửa" data-action="edit" data-id="${p.id}">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </button>
                  <button class="btn-icon" title="Xoá" data-action="delete" data-id="${p.id}" data-name="${escapeHtml(p.name)}">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </button>
                </td>
              </tr>`).join('') : '<tr><td colspan="5" class="empty-state">Chưa có sản phẩm nào</td></tr>'}
          </tbody>
        </table>
      </div>

      <div id="product-form-area"></div>
    </div>
  `;

  document.getElementById('p-search').addEventListener('input', e => {
    drawProductsPage(e.target.value, document.getElementById('p-category').value);
  });
  document.getElementById('p-category').addEventListener('change', e => {
    drawProductsPage(document.getElementById('p-search').value, e.target.value);
  });

  // Event delegation — data-name đã được HTML-escaped khi render
  content.querySelector('.table-wrap')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id   = +btn.dataset.id;
    const name = btn.dataset.name ?? '';   // đọc từ attribute, không phải innerHTML
    if (btn.dataset.action === 'edit')   startEditProduct(id);
    if (btn.dataset.action === 'delete') deleteProduct(id, name);
  });

  if (productFormOpen) renderProductForm();
}

function openProductForm() {
  editingProduct  = null;
  productFormOpen = true;
  renderProductForm();
}

function startEditProduct(id) {
  // Tái dùng allProducts nếu có, nếu không fetch lại
  api('/products').then(list => {
    editingProduct  = list.find(p => p.id === id);
    productFormOpen = true;
    renderProductForm();
  });
}

function renderProductForm() {
  const p   = editingProduct;
  const area = document.getElementById('product-form-area');
  if (!area) return;
  area.innerHTML = `
    <div class="form-card">
      <div class="form-title">${p ? 'Chỉnh sửa món' : 'Thêm món mới'}</div>
      <div class="form-row">
        <div class="form-field">
          <label>Tên món</label>
          <input id="f-name" type="text" value="${escapeHtml(p?.name)}" placeholder="Ví dụ: Cơm tấm sườn"/>
        </div>
        <div class="form-field">
          <label>Danh mục</label>
          <select id="f-category" onchange="syncUnitToCategory(this)">
            <option value="mon_an"        ${p?.category === 'mon_an'        ? 'selected' : ''}>Món ăn</option>
            <option value="mon_nuoc"      ${p?.category === 'mon_nuoc'      ? 'selected' : ''}>Món nước</option>
            <option value="bia_nuoc_ngot" ${p?.category === 'bia_nuoc_ngot' ? 'selected' : ''}>Bia & Nước ngọt</option>
          </select>
        </div>
        <div class="form-field">
          <label>Đơn vị</label>
          <select id="f-unit">
            <option value="con" ${p?.unit === 'con' ? 'selected' : ''}>con</option>
            <option value="kg"  ${p?.unit === 'kg'  ? 'selected' : ''}>kg</option>
            <option value="lon" ${p?.unit === 'lon' ? 'selected' : ''}>lon</option>
          </select>
        </div>
        <div class="form-field">
          <label>Giá bán (đ)</label>
          <input id="f-price" type="number" value="${p?.price ?? ''}" placeholder="35000" min="0" style="min-width:120px"/>
        </div>
        <div class="form-field" style="justify-content:flex-end">
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" onclick="saveProduct(${p?.id ?? null})">Lưu</button>
            <button class="btn btn-secondary" onclick="cancelProductForm()">Huỷ</button>
          </div>
        </div>
      </div>
    </div>`;
}

function syncUnitToCategory(categorySelect) {
  const unitSelect = document.getElementById('f-unit');
  if (!unitSelect) return;
  if (categorySelect.value === 'bia_nuoc_ngot') {
    unitSelect.value = 'lon';
  } else if (unitSelect.value === 'lon') {
    unitSelect.value = 'con';
  }
}

async function saveProduct(id) {
  const body = {
    name:     document.getElementById('f-name').value.trim(),
    category: document.getElementById('f-category').value,
    unit:     document.getElementById('f-unit').value,
    price:    parseFloat(document.getElementById('f-price').value),
  };
  if (!body.name || isNaN(body.price)) { showToast('Vui lòng điền đầy đủ thông tin', true); return; }

  try {
    if (id) {
      await api(`/products/${id}`, { method: 'PUT', body });
    } else {
      await api('/products', { method: 'POST', body });
    }
    productFormOpen = false;
    editingProduct  = null;
    await drawProductsPage();
    showToast(id ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm mới');
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, true);
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Xoá món "${name}"?`)) return;
  try {
    await api(`/products/${id}`, { method: 'DELETE' });
    await drawProductsPage();
    showToast('Đã xoá sản phẩm');
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, true);
  }
}

function cancelProductForm() {
  productFormOpen = false;
  editingProduct  = null;
  const area = document.getElementById('product-form-area');
  if (area) area.innerHTML = '';
}

// ── Page: Báo cáo ──────────────────────────────────────────────────────────

async function renderReport() {
  const data    = await api('/report/monthly');
  const content = document.getElementById('content');

  const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

  content.innerHTML = `
    <div class="report-metrics">
      <div class="metric-card">
        <div class="metric-label">Doanh thu tháng ${new Date().getMonth() + 1}</div>
        <div class="metric-value">${formatCurrency(data.revenue_this_month)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Tổng đơn tháng này</div>
        <div class="metric-value">${data.total_orders}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Giá trị trung bình / đơn</div>
        <div class="metric-value">${formatCurrency(data.avg_order_value)}</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">Doanh thu theo tháng — ${data.year}</div>
      <div class="chart-wrap" style="height:220px" id="monthly-chart"></div>
    </div>
  `;

  const chartData = data.chart.map(m => ({ label: MONTHS[m.month - 1], value: m.revenue }));
  document.getElementById('monthly-chart').appendChild(
    createBarChart(chartData, { color: '#0D9488' }),
  );
}

// ── Toast notification ──────────────────────────────────────────────────────

function showToast(msg, isError = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;
      font-size:13.5px;font-weight:500;z-index:100;transition:opacity .3s;
      box-shadow:0 2px 8px rgba(0,0,0,.12);`;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = isError ? '#FEE2E2' : '#DCFCE7';
  toast.style.color       = isError ? '#B91C1C' : '#15803D';
  toast.style.opacity     = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ── Init ───────────────────────────────────────────────────────────────────

function toggleSidebar() {
  document.querySelector('.layout').classList.toggle('sidebar-open');
}

function closeSidebar() {
  document.querySelector('.layout').classList.remove('sidebar-open');
}

function init() {
  document.getElementById('current-date').textContent = formatDate();

  document.getElementById('hamburger').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  // Đóng sidebar khi chọn trang (mobile)
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    a.addEventListener('click', closeSidebar);
  });

  window.addEventListener('hashchange', navigate);

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(TOKEN_KEY);
    showLoginPage();
  });

  navigate();
}

// ── Login form ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    showLoginPage();
  } else {
    init();
  }

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const btn      = e.target.querySelector('button[type="submit"]');
    const errEl    = document.getElementById('login-err');

    btn.disabled    = true;
    btn.textContent = 'Đang đăng nhập...';
    errEl.textContent = '';

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        errEl.textContent = data.detail ?? 'Đăng nhập thất bại';
        return;
      }
      const { token } = await res.json();
      sessionStorage.setItem(TOKEN_KEY, token);
      hideLoginPage();
      init();
    } catch {
      errEl.textContent = 'Không thể kết nối máy chủ';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Đăng nhập';
    }
  });
});
