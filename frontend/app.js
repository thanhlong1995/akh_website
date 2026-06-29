const API_BASE = 'https://akhwebsite-production.up.railway.app';

// ── Utilities ──────────────────────────────────────────────────────────────

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function formatDate(d = new Date()) {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
}

function formatDateTime(d) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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
  orders:    { title: 'Quản lý bàn',  action: { label: '+ Thêm bàn', fn: () => addTable() } },
  history:   { title: 'Đơn hàng',     action: null },
  products:  { title: 'Sản phẩm',     action: { label: '+ Thêm món', fn: () => openProductForm() } },
  report:    { title: 'Báo cáo',      action: null },
};

const RENDERERS = {
  dashboard: renderDashboard,
  orders:    renderOrders,
  history:   renderHistory,
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

// -- Page: Quan ly ban ------------------------------------------------

const TABLES_KEY    = 'akh_tables_v1';
const TBL_ITEMS_KEY = 'akh_table_items_v1';

let tables          = [];
let tableOrderItems = {};
let selectedTableId = null;
let allProductsCache = [];

function getTableItems() {
  return selectedTableId ? (tableOrderItems[selectedTableId] ?? []) : [];
}

function setTableItems(items) {
  if (!selectedTableId) return;
  tableOrderItems[selectedTableId] = items;
  try { localStorage.setItem(TBL_ITEMS_KEY, JSON.stringify(tableOrderItems)); } catch {}
}

function loadStorage() {
  try { tables          = JSON.parse(localStorage.getItem(TABLES_KEY)    ?? '[]'); } catch { tables = []; }
  try { tableOrderItems = JSON.parse(localStorage.getItem(TBL_ITEMS_KEY) ?? '{}'); } catch { tableOrderItems = {}; }
}

function saveTables() {
  try { localStorage.setItem(TABLES_KEY, JSON.stringify(tables)); } catch {}
}

function addTable() {
  const nextId = tables.length ? Math.max(...tables.map(t => t.id)) + 1 : 1;
  tables.push({ id: nextId });
  saveTables();
  redrawTablesGrid();
}

async function renderOrders() {
  loadStorage();
  allProductsCache = await api('/products');
  selectedTableId  = null;
  drawTablesPage();
}

function drawTablesPage() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="table-grid" id="table-grid"></div><div id="table-order-area"></div>';
  document.getElementById('table-grid').addEventListener('click', e => {
    const card = e.target.closest('[data-table-id]');
    if (card) selectTable(+card.dataset.tableId);
  });
  redrawTablesGrid();
}

function redrawTablesGrid() {
  const grid = document.getElementById('table-grid');
  if (!grid) return;
  if (!tables.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:60px 0">Chưa có bàn nào. Nhấn "+ Thêm bàn" để tạo.</div>';
    return;
  }
  grid.innerHTML = tables.map(function(t) {
    var id = t.id;
    var items    = tableOrderItems[id] ?? [];
    var hasItems = items.length > 0;
    var total    = items.reduce(function(s, item) { return s + item.product.price * item.quantity; }, 0);
    var isActive = selectedTableId === id;
    var cls = 'table-card' + (hasItems ? ' has-items' : '') + (isActive ? ' active' : '');
    var inner = hasItems
      ? '<div class="table-card-info"><span class="table-item-count">' + items.length + ' món</span><span class="table-total">' + formatCurrency(total) + '</span></div>'
      : '<div class="table-card-empty">Trống</div>';
    return '<div class="' + cls + '" data-table-id="' + id + '"><div class="table-card-name">Bàn ' + id + '</div>' + inner + '</div>';
  }).join('');
}

function selectTable(id) {
  selectedTableId = id;
  redrawTablesGrid();
  drawTableOrderArea();
}

function drawTableOrderArea() {
  var area = document.getElementById('table-order-area');
  if (!area) return;
  if (!selectedTableId) { area.innerHTML = ''; return; }
  var sec = document.createElement('div');
  sec.className = 'section-card';
  sec.style.marginTop = '20px';
  area.innerHTML = '';
  area.appendChild(sec);
  var tableId = selectedTableId;
  sec.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
      '<div class="section-title" style="margin-bottom:0">Bàn ' + tableId + '</div>' +
      '<button class="btn btn-danger" id="delete-table-btn" style="font-size:12px;padding:5px 12px">Xoá bàn</button>' +
    '</div>' +
    '<div class="form-field" style="margin-bottom:16px;position:relative">' +
      '<label>Tìm món</label>' +
      '<div class="search-wrap">' +
        '<input id="product-search" type="text" placeholder="Nhập tên món ăn / đồ uống..." style="width:100%;max-width:400px"/>' +
        '<div class="search-results" id="search-results" style="display:none"></div>' +
      '</div>' +
    '</div>' +
    '<div id="order-items-list"></div>' +
    '<div class="order-summary" id="order-summary" style="display:none">' +
      '<div class="summary-row"><span>Tạm tính</span><span id="subtotal"></span></div>' +
      '<div class="summary-row total"><span>Tổng cộng</span><span id="total"></span></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-primary" id="submit-order" disabled>Tạo đơn hàng</button>' +
      '<button class="btn btn-secondary" id="print-order" disabled>In phiếu</button>' +
    '</div>';
  document.getElementById('product-search').addEventListener('input', onProductSearch);
  document.getElementById('submit-order').addEventListener('click', submitOrder);
  document.getElementById('print-order').addEventListener('click', printOrder);
  document.getElementById('delete-table-btn').addEventListener('click', deleteSelectedTable);
  document.addEventListener('click', closeSearchOnOutside);
  renderOrderItems();
}

function deleteSelectedTable() {
  if (!selectedTableId) return;
  var id       = selectedTableId;
  var hasItems = (tableOrderItems[id] ?? []).length > 0;
  if (hasItems && !confirm('Bàn ' + id + ' đang có món. Xoá bàn này?')) return;
  tables = tables.filter(function(t) { return t.id !== id; });
  delete tableOrderItems[id];
  saveTables();
  try { localStorage.setItem(TBL_ITEMS_KEY, JSON.stringify(tableOrderItems)); } catch {}
  selectedTableId = null;
  redrawTablesGrid();
  var area = document.getElementById('table-order-area');
  if (area) area.innerHTML = '';
}

function onProductSearch(e) {
  var q   = e.target.value.trim().toLowerCase();
  var box = document.getElementById('search-results');
  if (!q) { box.style.display = 'none'; return; }
  var matches = allProductsCache.filter(function(p) { return p.name.toLowerCase().includes(q); }).slice(0, 8);
  if (!matches.length) { box.style.display = 'none'; return; }
  box.innerHTML = matches.map(function(p) {
    return '<div class="search-result-item" data-id="' + p.id + '">' +
      '<span>' + escapeHtml(p.name) + ' <small style="color:var(--gray-400)">' + escapeHtml(categoryLabel(p.category)) + '</small></span>' +
      '<span style="color:var(--gray-600)">' + formatCurrency(p.price) + '/' + escapeHtml(p.unit) + '</span>' +
    '</div>';
  }).join('');
  box.style.display = '';
  box.querySelectorAll('.search-result-item').forEach(function(el) {
    el.addEventListener('click', function() {
      var product = allProductsCache.find(function(p) { return p.id === +el.dataset.id; });
      addToOrder(product);
      document.getElementById('product-search').value = '';
      box.style.display = 'none';
    });
  });
}

function closeSearchOnOutside(e) {
  if (!e.target.closest('.search-wrap')) {
    var box = document.getElementById('search-results');
    if (box) box.style.display = 'none';
  }
}

function addToOrder(product) {
  var items    = getTableItems();
  var existing = items.find(function(i) { return i.product.id === product.id; });
  if (existing) {
    existing.quantity = +(existing.quantity + (product.unit === 'kg' ? 0.1 : 1)).toFixed(1);
  } else {
    items.push({ product: product, quantity: product.unit === 'kg' ? 0.1 : 1 });
  }
  setTableItems(items);
  renderOrderItems();
  redrawTablesGrid();
}

function changeQty(productId, delta) {
  var items = getTableItems();
  var item  = items.find(function(i) { return i.product.id === productId; });
  if (!item) return;
  var step    = item.product.unit === 'kg' ? 0.1 : 1;
  item.quantity = +(item.quantity + delta * step).toFixed(1);
  if (item.quantity <= 0) {
    setTableItems(items.filter(function(i) { return i.product.id !== productId; }));
  } else {
    setTableItems(items);
  }
  renderOrderItems();
  redrawTablesGrid();
}

function renderOrderItems() {
  var list     = document.getElementById('order-items-list');
  var summary  = document.getElementById('order-summary');
  var btn      = document.getElementById('submit-order');
  var printBtn = document.getElementById('print-order');
  if (!list) return;
  var items = getTableItems();
  if (!items.length) {
    list.innerHTML = '<div class="empty-state" style="padding:32px 0">Chưa có món nào trong bàn</div>';
    if (summary)  summary.style.display = 'none';
    if (btn)      btn.disabled = true;
    if (printBtn) printBtn.disabled = true;
    return;
  }
  var rows = items.map(function(item) {
    var p = item.product; var q = item.quantity;
    return '<div class="order-item-row">' +
      '<span class="order-item-name">' + escapeHtml(p.name) + '</span>' +
      '<div class="item-controls">' +
        '<div class="qty-ctrl">' +
          '<button class="qty-btn" data-action="dec" data-id="' + p.id + '">−</button>' +
          '<input class="qty-value" type="number" value="' + q + '" min="0.1" step="0.1" data-id="' + p.id + '"/>' +
          '<button class="qty-btn" data-action="inc" data-id="' + p.id + '">+</button>' +
        '</div>' +
        '<small style="color:var(--gray-400)">' + escapeHtml(p.unit) + '</small>' +
        '<span class="order-item-price">' + formatCurrency(p.price * q) + '</span>' +
      '</div>' +
      '<button class="btn-icon" data-action="remove" data-id="' + p.id + '" title="Xoá">' +
        '<svg width="15" height="15" fill="none" viewBox="0 0 24 24">' +
          '<path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>' +
      '</button>' +
    '</div>';
  }).join('');
  list.innerHTML = '<div class="order-items">' + rows + '</div>';
  var orderItemsEl = list.querySelector('.order-items');
  if (orderItemsEl) {
    orderItemsEl.addEventListener('click', function(e) {
      var b = e.target.closest('[data-action]');
      if (!b) return;
      var id = +b.dataset.id;
      if (b.dataset.action === 'inc')    changeQty(id, 1);
      if (b.dataset.action === 'dec')    changeQty(id, -1);
      if (b.dataset.action === 'remove') {
        setTableItems(getTableItems().filter(function(i) { return i.product.id !== id; }));
        renderOrderItems();
        redrawTablesGrid();
      }
    });
    orderItemsEl.addEventListener('change', function(e) {
      var input = e.target.closest('input.qty-value');
      if (!input) return;
      var id    = +input.dataset.id;
      var val   = parseFloat(input.value);
      var items = getTableItems();
      var item  = items.find(function(i) { return i.product.id === id; });
      if (!item) return;
      if (isNaN(val) || val <= 0) { input.value = item.quantity; return; }
      item.quantity = parseFloat(val.toFixed(2));
      setTableItems(items);
      renderOrderItems();
      redrawTablesGrid();
    });
  }
  var total = items.reduce(function(s, item) { return s + item.product.price * item.quantity; }, 0);
  document.getElementById('subtotal').textContent = formatCurrency(total);
  document.getElementById('total').textContent    = formatCurrency(total);
  summary.style.display = '';
  btn.disabled = false;
  if (printBtn) printBtn.disabled = false;
}

async function submitOrder() {
  var btn   = document.getElementById('submit-order');
  var items = getTableItems();
  if (!btn) return;
  btn.disabled    = true;
  btn.textContent = 'Đang lưu...';
  try {
    await api('/orders', {
      method: 'POST',
      body: {
        customer_id: null,
        items: items.map(function(item) { return { product_id: item.product.id, quantity: item.quantity }; }),
      },
    });
    setTableItems([]);
    drawTableOrderArea();
    redrawTablesGrid();
    showToast('Đã tạo đơn hàng cho Bàn ' + selectedTableId);
  } catch (err) {
    showToast('Lỗi: ' + err.message, true);
    if (btn) { btn.disabled = false; btn.textContent = 'Tạo đơn hàng'; }
  }
}

// -- Print order --------------------------------------------------------

function printOrder() {
  var tableId = selectedTableId;
  var items   = getTableItems();
  var pw = Math.round(window.screen.width * 0.8);
  var ph = Math.round(window.screen.height * 0.8);
  var pl = Math.round((window.screen.width - pw) / 2);
  var pt = Math.round((window.screen.height - ph) / 2);
  var w = window.open('', '_blank', 'width=' + pw + ',height=' + ph + ',left=' + pl + ',top=' + pt);
  if (!w) { showToast('Trình duyệt đang chặn popup. Vui lòng cho phép popup để in.', true); return; }
  var now   = new Date();
  var total = items.reduce(function(s, item) { return s + item.product.price * item.quantity; }, 0);
  var doc   = w.document;
  doc.documentElement.lang = 'vi';
  doc.title = 'Phieu dat mon - Ban ' + tableId + ' - AKH Quan';
  var meta = doc.createElement('meta'); meta.setAttribute('charset', 'UTF-8'); doc.head.appendChild(meta);
  var style = doc.createElement('style');
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
  var b      = doc.body;
  var mk     = function(tag, cls) { var e = doc.createElement(tag); if (cls) e.className = cls; return e; };
  var tx     = function(tag, text, cls) { var e = mk(tag, cls); e.textContent = text; return e; };
  var hr     = function() { return doc.createElement('hr'); };
  var td     = function(text, cls) { var e = mk('td', cls); e.textContent = text; return e; };
  var addRow = function(table, cells) { var row = doc.createElement('tr'); cells.forEach(function(c) { row.appendChild(c); }); table.appendChild(row); };
  b.appendChild(tx('h1', 'AKH SHOP'));
  b.appendChild(tx('p', 'Phiếu đặt món', 'sub'));
  b.appendChild(tx('p', 'ĐT: 0961279291', 'sub'));
  b.appendChild(hr());
  var infoTable = mk('table', 'info');
  var dateVal = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  addRow(infoTable, [td('Ngày in:'), td(dateVal)]);
  addRow(infoTable, [td('Bàn:'), td('Bàn ' + tableId)]);
  b.appendChild(infoTable);
  b.appendChild(hr());
  var itemsTable = mk('table', 'items');
  var thead = doc.createElement('thead');
  var hRow  = doc.createElement('tr');
  ['#', 'Món', 'SL', 'Đơn giá', 'T.tiền'].forEach(function(h, i) { hRow.appendChild(tx('th', h, i >= 2 ? 'r' : '')); });
  thead.appendChild(hRow); itemsTable.appendChild(thead);
  var tbody = doc.createElement('tbody');
  items.forEach(function(item, i) {
    var p = item.product; var q = item.quantity;
    addRow(tbody, [td(String(i + 1)), td(p.name), td(q + ' ' + p.unit, 'r'), td(formatCurrency(p.price), 'r'), td(formatCurrency(p.price * q), 'r')]);
  });
  itemsTable.appendChild(tbody); b.appendChild(itemsTable);
  var totalTable = mk('table'); totalTable.style.marginTop = '8px';
  var totalTd = td(formatCurrency(total), 'r'); totalTd.style.textAlign = 'right';
  addRow(totalTable, [td('TỔNG CỘNG', 'total-row'), totalTd]);
  b.appendChild(totalTable); b.appendChild(hr());
  b.appendChild(tx('p', '— Cảm ơn quý khách! —', 'footer'));
  w.focus(); w.print();
  w.addEventListener('afterprint', function() { w.close(); });
}


// ── Page: Đơn hàng ─────────────────────────────────────────────────────────

let orderListCache    = [];
let orderDetailCache  = {};
let currentModalOrderId = null;

async function renderHistory() {
  orderListCache = await api('/orders');
  drawHistoryPage();
}

function drawHistoryPage() {
  document.getElementById('content').innerHTML = `
    <div class="section-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody id="orders-tbody"></tbody>
        </table>
      </div>
    </div>`;
  renderOrdersTable();
}

function renderOrdersTable() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  if (!orderListCache.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Chưa có đơn hàng nào</td></tr>';
    return;
  }

  tbody.innerHTML = orderListCache.map(o => `
    <tr class="order-row" onclick="openOrderModal(${o.id})">
      <td><strong>#${o.id}</strong></td>
      <td>${formatCurrency(o.total_amount)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="color:var(--gray-600);font-size:13px">${formatDateTime(new Date(o.created_at))}</td>
    </tr>`).join('');
}

// ── Order detail modal ──────────────────────────────────────────────────────

async function openOrderModal(orderId) {
  currentModalOrderId = orderId;
  document.getElementById('order-modal').style.display = 'flex';

  const order = orderListCache.find(o => o.id === orderId);
  document.getElementById('modal-title').textContent = `Đơn hàng #${orderId}`;
  if (order) {
    document.getElementById('modal-total').textContent = formatCurrency(order.total_amount);
    const sel = document.getElementById('modal-status');
    sel.value = order.status;
    sel.className = `status-select status-${order.status}`;
  }

  const body = document.getElementById('modal-body');

  if (orderDetailCache[orderId]) {
    renderModalBody(body, orderDetailCache[orderId]);
    return;
  }

  body.innerHTML = '<p class="modal-loading">Đang tải...</p>';
  try {
    const detail = await api(`/orders/${orderId}`);
    orderDetailCache[orderId] = detail;
    if (currentModalOrderId === orderId) renderModalBody(body, detail);
  } catch (err) {
    if (currentModalOrderId === orderId)
      body.innerHTML = `<p class="modal-loading" style="color:#ef4444">${escapeHtml(err.message || 'Không tải được chi tiết')}</p>`;
  }
}

function renderModalBody(body, detail) {
  const items = Array.isArray(detail.items) ? detail.items : [];
  const rows = items.map(item => `
    <tr>
      <td>${escapeHtml(item.product_name)}</td>
      <td style="text-align:right">${item.quantity}</td>
      <td style="text-align:right">${formatCurrency(item.unit_price)}</td>
      <td style="text-align:right;font-weight:600">${formatCurrency(item.subtotal)}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty-state">Không có món</td></tr>';

  body.innerHTML = `
    <table class="detail-table">
      <thead>
        <tr>
          <th>Món</th>
          <th style="text-align:right">SL</th>
          <th style="text-align:right">Đơn giá</th>
          <th style="text-align:right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function closeOrderModal() {
  document.getElementById('order-modal').style.display = 'none';
  currentModalOrderId = null;
}

async function changeModalStatus(sel) {
  if (!currentModalOrderId) return;
  const orderId   = currentModalOrderId;
  const newStatus = sel.value;
  const order     = orderListCache.find(o => o.id === orderId);
  if (!order) return;

  const oldStatus = order.status;
  order.status = newStatus;
  sel.className = `status-select status-${newStatus}`;

  try {
    await api(`/orders/${orderId}`, { method: 'PUT', body: { status: newStatus } });
    renderOrdersTable();
    showToast('Đã cập nhật trạng thái đơn hàng');
  } catch (err) {
    order.status = oldStatus;
    sel.value     = oldStatus;
    sel.className = `status-select status-${oldStatus}`;
    showToast(`Lỗi: ${err.message}`, true);
  }
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
