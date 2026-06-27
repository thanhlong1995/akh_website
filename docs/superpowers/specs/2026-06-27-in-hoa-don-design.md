# Thiết kế: Tính năng In Hóa Đơn Nhiệt (Xprinter)

**Ngày:** 2026-06-27  
**Phạm vi:** In hóa đơn thanh toán từ dashboard AKH Quán lên máy in Xprinter qua USB (58mm / 80mm)  
**Phương án:** `window.print()` + CSS `@media print` — không cần cài phần mềm thêm

---

## 1. Kiến trúc tổng quan

```
[Nhân viên click "In hóa đơn"]
        ↓
[app.js] fetch GET /orders/{id}
        ↓
Populate <div id="receipt"> ẩn trong DOM
        ↓
Inject <style>@page { size: [width] auto }</style> (lấy từ localStorage)
        ↓
window.print() → Browser mở hộp thoại in
        ↓
CSS @media print ẩn toàn bộ UI, chỉ hiện #receipt
        ↓
Xprinter nhận lệnh in — auto-cut qua Windows Printer Settings
```

**Không thêm dependency mới.** Toàn bộ logic nằm trong frontend + 1 endpoint backend mới.

---

## 2. Backend: Endpoint mới

### `GET /orders/{id}` → `OrderDetail`

Endpoint trả về chi tiết đầy đủ của 1 đơn, bao gồm tên sản phẩm (join với bảng `products`).

**Response model mới `OrderDetail`** (thêm vào `models.py`):

```python
class OrderItemDetail(BaseModel):
    product_name: str
    quantity: float
    unit_price: float
    subtotal: float          # quantity * unit_price, tính ở backend

class OrderDetail(BaseModel):
    id: int
    customer_name: Optional[str]
    total_amount: float
    status: Literal["xu_ly", "dang_giao", "da_giao", "huy"]
    created_at: datetime
    items: list[OrderItemDetail]
```

**SQL:**
```sql
SELECT
    o.id, o.total_amount, o.status, o.created_at,
    c.name AS customer_name,
    p.name AS product_name,
    oi.quantity, oi.unit_price,
    (oi.quantity * oi.unit_price) AS subtotal
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.id = %s
```

Trả về 404 nếu không tìm thấy đơn.

---

## 3. Frontend: Cấu trúc receipt

### 3.1 HTML (`index.html`)

Thêm vào cuối `<body>`, ngoài sidebar/main:

```html
<div id="receipt" aria-hidden="true">
  <div class="receipt-header">
    <p class="receipt-shop-name">AKH QUÁN</p>
    <p class="receipt-meta">Địa chỉ: [địa chỉ quán]</p>
    <p class="receipt-meta">Tel: [số điện thoại]</p>
    <p class="receipt-meta" id="receipt-datetime"></p>
    <p class="receipt-meta" id="receipt-order-id"></p>
    <p class="receipt-meta" id="receipt-customer"></p>
  </div>
  <div class="receipt-divider"></div>
  <table class="receipt-items" id="receipt-items"></table>
  <div class="receipt-divider"></div>
  <p class="receipt-total" id="receipt-total"></p>
  <p class="receipt-footer">Cảm ơn quý khách!</p>
</div>
```

Dropdown khổ giấy — thêm vào topbar:
```html
<select id="receipt-width-select" title="Khổ giấy máy in">
  <option value="80mm">80mm</option>
  <option value="58mm">58mm</option>
</select>
```

### 3.2 CSS (`style.css`)

```css
/* Ẩn receipt khi xem thường */
#receipt { display: none; }

/* Dropdown khổ giấy — chỉ hiện trong UI, ẩn khi in */
#receipt-width-select { /* style inline với topbar */ }

@media print {
  /* Ẩn toàn bộ UI */
  body > * { display: none !important; }

  /* Chỉ hiện receipt */
  #receipt {
    display: block !important;
    font-family: monospace;
    font-size: 9pt;
    width: 100%;
    padding: 4mm 2mm;
  }

  .receipt-shop-name {
    text-align: center;
    font-weight: bold;
    font-size: 11pt;
  }

  .receipt-meta { text-align: center; font-size: 8pt; }

  .receipt-divider {
    border-top: 1px dashed #000;
    margin: 4px 0;
  }

  .receipt-items {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
  }
  .receipt-items th { text-align: left; }
  .receipt-items td:last-child { text-align: right; }

  .receipt-total {
    text-align: right;
    font-weight: bold;
    font-size: 10pt;
  }

  .receipt-footer { text-align: center; font-size: 8pt; margin-top: 8px; }

  /* Tắt header/footer mặc định của browser */
  @page {
    margin: 0;
    /* width được inject động bởi JS */
  }

  /* Đảm bảo không xuống trang giữa chừng */
  #receipt { page-break-inside: avoid; }
}
```

### 3.3 JavaScript (`app.js`)

**Hàm `printOrder(orderId)`:**

```javascript
async function printOrder(orderId) {
  const order = await api(`/orders/${orderId}`);

  // Populate DOM
  document.getElementById('receipt-datetime').textContent =
    new Date(order.created_at).toLocaleString('vi-VN');
  document.getElementById('receipt-order-id').textContent = `Hóa đơn #${order.id}`;
  document.getElementById('receipt-customer').textContent =
    order.customer_name ? `Khách: ${order.customer_name}` : 'Khách vãng lai';

  const tbody = document.getElementById('receipt-items');
  tbody.innerHTML = `
    <tr><th>Tên món</th><th>SL</th><th>Giá</th><th>T.Tiền</th></tr>
    ${order.items.map(i => `
      <tr>
        <td>${i.product_name}</td>
        <td>${i.quantity}</td>
        <td>${formatCurrency(i.unit_price)}</td>
        <td>${formatCurrency(i.subtotal)}</td>
      </tr>`).join('')}
  `;

  document.getElementById('receipt-total').textContent =
    `TỔNG: ${formatCurrency(order.total_amount)}`;

  // Inject khổ giấy động
  const width = localStorage.getItem('receipt_width') || '80mm';
  let styleEl = document.getElementById('receipt-page-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'receipt-page-style';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `@media print { @page { size: ${width} auto; } }`;

  window.print();
}
```

**Lưu khổ giấy khi đổi:**
```javascript
document.getElementById('receipt-width-select').addEventListener('change', e => {
  localStorage.setItem('receipt_width', e.target.value);
});
```

---

## 4. Vị trí nút "In hóa đơn"

### A. Trang Tạo đơn — sau khi tạo thành công

Thay nút "Tạo đơn" bằng trạng thái thành công + 2 nút:
```
✓ Đã tạo đơn #0042
[In hóa đơn]   [Tạo đơn mới]
```
`printOrder(newOrderId)` được gọi khi click "In hóa đơn".

### B. Trang Tổng quan — bảng đơn gần đây

Thêm cột action cuối bảng với icon in:
```
| #0042 | Nguyễn A | 100.000đ | Xử lý | [🖨] |
```

---

## 5. Hướng dẫn cài một lần (cho nhân viên)

Sau khi tính năng lên production, nhân viên chỉ cần:
1. Mở hộp thoại in lần đầu → chọn **Xprinter** làm máy in
2. Đặt làm **máy in mặc định** trong Windows
3. Bật **auto-cut** trong Printer Properties → Advanced → tích "Enable auto cut"
4. Tick **"Remember settings"** → các lần sau in không cần thao tác thêm

---

## 6. Các file thay đổi

| File | Thay đổi |
|---|---|
| `backend/models.py` | Thêm `OrderItemDetail`, `OrderDetail` |
| `backend/routes/orders.py` | Thêm `GET /orders/{id}` |
| `frontend/index.html` | Thêm `#receipt` div, dropdown khổ giấy |
| `frontend/style.css` | Thêm `@media print`, `@page`, receipt styles |
| `frontend/app.js` | Thêm `printOrder()`, paper width logic, nút in 2 nơi |

---

## 7. Không nằm trong scope

- In tem nhãn sản phẩm
- In đơn giao hàng / e-commerce
- WebUSB / ESC/POS trực tiếp
- In từ mobile / tablet
