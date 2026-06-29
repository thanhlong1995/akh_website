# AKH Quán Admin Dashboard — Project Plan

---

## Mục tiêu

Xây dựng web quản lý bán hàng (admin dashboard) cho cửa hàng ăn uống AKH Quán với 6 chức năng chính: Tổng quan, Quản lý bàn (tạo đơn theo bàn), Đơn hàng (lịch sử + đổi trạng thái), Quản lý sản phẩm, và Báo cáo doanh thu.

---

## Tech Stack / Ràng buộc

| Layer     | Công nghệ                                        | Ghi chú ràng buộc |
|-----------|--------------------------------------------------|-------------------|
| Frontend  | HTML + CSS + Vanilla JavaScript                  | Không dùng framework (React, Vue, ...) |
| Backend   | Python FastAPI                                   | |
| Database  | PostgreSQL qua Supabase                          | |
| Hosting   | Frontend → Vercel, Backend → Railway             | |
| Ngôn ngữ UI | Tiếng Việt toàn bộ                             | |
| Định dạng tiền | `320.000đ` (dấu chấm ngăn cách hàng nghìn) | |
| Màu chủ đạo | `#185FA5`                                      | |
| Design | Flat, không shadow, không gradient                  | Border radius: 8px elements, 12px cards |

---

## Tiến độ

> ✅ Xong / 🔄 Đang làm / ⬜ Chưa làm

### Giai đoạn 0 — Tài liệu & Thiết kế
| # | Hạng mục | Trạng thái |
|---|---|---|
| 0.1 | business.md — yêu cầu nghiệp vụ | ✅ |
| 0.2 | database.md — schema PostgreSQL | ✅ |
| 0.3 | infrastructure.md — tech stack + API | ✅ |
| 0.4 | Design.md — UI/UX spec 4 trang | ✅ |
| 0.5 | plan.md — kế hoạch triển khai | ✅ |

---

### Giai đoạn 0.5 — Tính năng Login
| # | Hạng mục | File | Trạng thái |
|---|---|---|---|
| L.1 | `routes/auth.py` — `POST /auth/login`, hash SHA-256, trả về session token | `backend/routes/auth.py` | ✅ |
| L.2 | Middleware `auth_middleware` trong `main.py` — bảo vệ tất cả routes trừ public paths | `backend/main.py` | ✅ |
| L.3 | Login page overlay trong `index.html` + CSS trong `style.css` | Frontend | ✅ |
| L.4 | Auth logic trong `app.js` — `api()` gửi Bearer token, xử lý 401, login/logout handlers | `frontend/app.js` | ✅ |
| L.5 | Nút Đăng xuất ở cuối sidebar | `frontend/index.html` | ✅ |

---

### Giai đoạn 1 — Backend: Khởi tạo & Cấu hình
| # | Hạng mục | Trạng thái |
|---|---|---|
| 1.1 | Tạo cấu trúc thư mục `backend/` | ✅ |
| 1.2 | `requirements.txt` (fastapi, uvicorn, psycopg2, python-dotenv, pydantic) | ✅ |
| 1.3 | `.env.example` với biến `DATABASE_URL`, `SUPABASE_KEY` | ✅ |
| 1.4 | `main.py` — FastAPI app + CORS cho Vercel frontend | ✅ |
| 1.5 | `models.py` — Pydantic schemas cho request/response | ✅ |

---

### Giai đoạn 2 — Backend: Database
| # | Hạng mục | Trạng thái |
|---|---|---|
| 2.1 | Tạo project trên Supabase | ✅ |
| 2.2 | Chạy SQL tạo bảng `products` | ✅ |
| 2.3 | Chạy SQL tạo bảng `customers` | ✅ |
| 2.4 | Chạy SQL tạo bảng `orders` (có cột `status`, `customer_id` nullable) | ✅ |
| 2.5 | Chạy SQL tạo bảng `order_items` | ✅ |
| 2.6 | Seed dữ liệu mẫu (5–10 sản phẩm, 2–3 đơn hàng) | ✅ |

**SQL khởi tạo (chạy trên Supabase SQL Editor):**
```sql
CREATE TABLE products (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR NOT NULL,
  category   VARCHAR NOT NULL CHECK (category IN ('mon_an', 'mon_nuoc', 'bia_nuoc_ngot')),
  unit       VARCHAR NOT NULL CHECK (unit IN ('con', 'kg')),
  price      NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE customers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR NOT NULL,
  phone      VARCHAR,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE orders (
  id            SERIAL PRIMARY KEY,
  customer_id   INT REFERENCES customers(id) ON DELETE SET NULL,
  total_amount  NUMERIC NOT NULL,
  status        VARCHAR NOT NULL DEFAULT 'xu_ly'
                  CHECK (status IN ('xu_ly', 'dang_giao', 'da_giao', 'huy')),
  created_at    TIMESTAMP DEFAULT now()
);

CREATE TABLE order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  quantity    NUMERIC NOT NULL,
  unit_price  NUMERIC NOT NULL
);
```

---

### Giai đoạn 3 — Backend: API Endpoints
| # | Hạng mục | File | Trạng thái |
|---|---|---|---|
| 3.1 | `GET /products` + `POST /products` | `routes/products.py` | ✅ |
| 3.2 | `PUT /products/{id}` + `DELETE /products/{id}` | `routes/products.py` | ✅ |
| 3.3 | `GET /customers` + `POST /customers` | `routes/customers.py` | ✅ |
| 3.4 | `POST /orders` (tạo đơn + items trong 1 transaction) | `routes/orders.py` | ✅ |
| 3.5 | `GET /orders` + `GET /orders/recent` + `GET /orders/{id}` | `routes/orders.py` | ✅ |
| 3.10 | `PUT /orders/{id}` — đổi trạng thái đơn hàng | `routes/orders.py` | ✅ |
| 3.6 | `GET /dashboard/stats` (4 chỉ số + delta hôm qua) | `routes/dashboard.py` | ✅ |
| 3.7 | `GET /dashboard/revenue-chart` (7 ngày gần nhất) | `routes/dashboard.py` | ✅ |
| 3.8 | `GET /report/monthly` (12 tháng, tổng đơn, TB đơn) | `routes/report.py` | ✅ |
| 3.9 | Test thủ công toàn bộ API qua Swagger UI (`/docs`) | — | ✅ |

---

### Giai đoạn 4 — Frontend: Bố cục chung
| # | Hạng mục | File | Trạng thái |
|---|---|---|---|
| 4.1 | `index.html` — cấu trúc sidebar + topbar + main content | `frontend/index.html` | ✅ |
| 4.2 | `style.css` — reset, biến CSS (`--primary: #185FA5`), sidebar, topbar, cards, table, badge, button | `frontend/style.css` | ✅ |
| 4.3 | `app.js` — router đơn giản (hash-based), hàm `formatCurrency()`, `renderPage()` | `frontend/app.js` | ✅ |

---

### Giai đoạn 5 — Frontend: Từng trang
| # | Hạng mục | Trạng thái |
|---|---|---|
| 5.1 | **Trang 1 — Tổng quan**: 4 metric cards (với delta), biểu đồ 7 ngày (SVG), bảng đơn gần đây + badge trạng thái | ✅ |
| 5.2 | **Trang 2 — Quản lý bàn** *(trước đây là "Tạo đơn hàng")*: lưới bàn 3/hàng, thêm bàn tự tăng số, click bàn mở form đơn hàng per-bàn, lưu state vào localStorage | ✅ |
| 5.3 | **Trang 3 — Đơn hàng**: danh sách tất cả đơn, expand row xem chi tiết món, select đổi trạng thái inline (optimistic update) | ✅ |
| 5.4 | **Trang 4 — Sản phẩm**: bảng (tên, danh mục, đơn vị, giá), search + lọc danh mục, form thêm/sửa inline | ✅ |
| 5.5 | **Trang 5 — Báo cáo**: 3 metric cards tháng, biểu đồ 12 cột (T1–T12) | ✅ |

---

### Giai đoạn 6 — Tích hợp & Hoàn thiện
| # | Hạng mục | Trạng thái |
|---|---|---|
| 6.1 | Kết nối toàn bộ API calls từ `app.js` đến FastAPI backend | ✅ |
| 6.2 | Xử lý loading state và error state (API chậm / lỗi mạng) | ✅ |
| 6.3 | Kiểm tra responsive cơ bản (tablet xuống ~768px) | ✅ |
| 6.4 | `README.md` — hướng dẫn cài đặt local và deploy | ✅ |

---

### Giai đoạn 7 — Deploy
| # | Hạng mục | Trạng thái |
|---|---|---|
| 7.1 | Deploy backend lên Railway — thêm `railway.toml` ở root, kết nối GitHub repo để auto-deploy | ✅ |
| 7.2 | Cập nhật `API_BASE` trong `app.js` → `https://akhwebsite-production.up.railway.app` | ✅ |
| 7.3 | Deploy frontend lên Vercel → `https://akhwebsites.vercel.app` (Root Directory = `frontend`) | ✅ |
| 7.4 | Smoke test toàn bộ 4 trang trên production URL | ✅ |

**Các fix đã thực hiện trong quá trình deploy:**
- Thêm `railway.toml` ở root (Railpack không tìm được file trong `backend/`)
- Bỏ pin version cứng `==` trong `requirements.txt` → dùng `>=`
- Hardcode Vercel URL vào CORS default (Railway chưa nhận env var kịp)
- Fix psycopg2 SSL: truyền `sslmode='require'` qua kwargs thay vì nhúng vào URL string
- Đọc `SUPABASE_URL` trước `DATABASE_URL` để tránh Railway override
- Fix IPv6: chuyển sang Supabase Transaction Mode Pooler (port 6543, IPv4) thay vì direct connection (port 5432, IPv6 — Railway không reach được)
- Xóa `db_error` khỏi `/health` endpoint (bảo mật — không lộ stack trace ra public)

---

### Giai đoạn 8 — Tính năng In Hóa Đơn Nhiệt (Xprinter)

> Spec: `docs/superpowers/specs/2026-06-27-in-hoa-don-design.md`
> Plan: `docs/superpowers/plans/2026-06-27-in-hoa-don.md`

| # | Hạng mục | File | Trạng thái |
|---|---|---|---|
| 8.1 | `GET /orders/{id}` → `OrderDetail` (join orders + order_items + products + customers) | `backend/models.py`, `backend/routes/orders.py` | ✅ |
| 8.2 | `printOrder()` in phiếu đặt món từ form bàn — mở popup window, in thermal receipt layout | `frontend/app.js` | ✅ |
| 8.3 | Thêm thông tin liên hệ `ĐT: 0961279291` vào phiếu in | `frontend/app.js` | ✅ |

---

### Giai đoạn 9 — Quản lý bàn & Đơn hàng CRUD

| # | Hạng mục | File | Trạng thái |
|---|---|---|---|
| 9.1 | Chuyển "Tạo đơn hàng" → "Quản lý bàn": lưới 3 bàn/hàng, bàn tự tăng số (Bàn 1, 2, …N) | `frontend/app.js`, `frontend/index.html`, `frontend/style.css` | ✅ |
| 9.2 | State per-bàn: mỗi bàn có danh sách món riêng, lưu vào `localStorage` (key `akh_tables_v1`, `akh_table_items_v1`) | `frontend/app.js` | ✅ |
| 9.3 | Form đơn hàng per-bàn: tìm món, tăng/giảm số lượng, tạo đơn, in phiếu, xoá bàn | `frontend/app.js` | ✅ |
| 9.4 | `OrderStatusUpdate` Pydantic model + `PUT /orders/{id}` endpoint | `backend/models.py`, `backend/routes/orders.py` | ✅ |
| 9.5 | Trang "Đơn hàng" (`#history`): bảng tất cả đơn, expand row xem chi tiết, select đổi trạng thái inline | `frontend/app.js`, `frontend/index.html`, `frontend/style.css` | ✅ |
| 9.6 | Sidebar cập nhật: 5 mục (Tổng quan, Bàn, Đơn hàng, Sản phẩm, Báo cáo) | `frontend/index.html` | ✅ |
| 9.7 | `business.md` cập nhật spec module 2 & 3 | `document/business.md` | ✅ |

---

## Quyết định quan trọng đã đưa ra

| # | Quyết định | Lý do |
|---|---|---|
| D1 | `customer_id` là nullable — không bắt buộc chọn khách khi tạo đơn | Hỗ trợ khách vãng lai, tránh cản luồng tạo đơn nhanh |
| D2 | `unit_price` được snapshot vào `order_items` khi tạo đơn | Giá sản phẩm có thể thay đổi sau; lịch sử đơn phải phản ánh giá lúc mua |
| D3 | Backend tự tính `total_amount` và snapshot `unit_price` — frontend không truyền giá lên | Tránh tamper giá từ phía client |
| D4 | Status đơn hàng mặc định khi tạo là `xu_ly` | Phù hợp luồng vận hành thực tế của quán |
| D5 | Không dùng JS framework | Ràng buộc từ spec — giữ đơn giản, không cần build pipeline |
| D6 | Biểu đồ dựng bằng Canvas API hoặc SVG thuần | Không dùng thư viện chart bên ngoài để tránh dependency |
| D7 | Router hash-based (`#dashboard`, `#orders`, `#history`, ...) | SPA đơn giản không cần server-side routing |
| D8 | State bàn lưu localStorage, không lưu DB | Bàn là khái niệm vận hành tạm thời — không cần persist server; reset sau khi tạo đơn là đủ |
| D9 | Order detail lazy-load + cache trong `orderDetailCache` | Tránh fetch tất cả items khi render danh sách; cache tránh re-fetch khi toggle expand |
| D10 | Đổi trạng thái dùng optimistic update | UI phản hồi tức thì, rollback nếu API lỗi — UX tốt hơn so với chờ server confirm |
| D11 | `PUT /orders/{id}` chỉ update status, không update items | Items đã snapshot giá tại thời điểm tạo (D2) — không nên sửa sau khi tạo |

---

## Bước tiếp theo

1. Deploy lên Railway + Vercel để cập nhật production với các tính năng Stage 9
2. Smoke test trang **Bàn**: thêm bàn → thêm món → tạo đơn → in phiếu
3. Smoke test trang **Đơn hàng**: xem danh sách → expand chi tiết → đổi trạng thái
4. Xem xét thêm tính năng lọc/tìm kiếm đơn hàng theo ngày hoặc trạng thái nếu cần
