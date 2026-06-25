# AKH Quán Admin Dashboard — Project Plan

---

## Mục tiêu

Xây dựng web quản lý bán hàng (admin dashboard) cho cửa hàng ăn uống AKH Quán với 4 chức năng chính: Tổng quan, Tạo đơn hàng, Quản lý sản phẩm, và Báo cáo doanh thu.

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
| 3.5 | `GET /orders` + `GET /orders/recent` | `routes/orders.py` | ✅ |
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
| 5.1 | **Trang 1 — Tổng quan**: 4 metric cards (với delta), biểu đồ 7 ngày (canvas/SVG), bảng đơn gần đây + badge trạng thái | ✅ |
| 5.2 | **Trang 2 — Tạo đơn hàng**: ô nhập khách (tuỳ chọn), search sản phẩm, danh sách món đã thêm, tính tổng tự động, nút Tạo đơn | ✅ |
| 5.3 | **Trang 3 — Sản phẩm**: bảng (tên, danh mục, đơn vị, giá), search + lọc danh mục, form thêm/sửa inline | ✅ |
| 5.4 | **Trang 4 — Báo cáo**: 3 metric cards tháng, biểu đồ 12 cột (T1–T12) | ✅ |

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
| 7.1 | Deploy backend lên Railway (set env vars `DATABASE_URL`, `SUPABASE_KEY`, `CORS_ORIGINS`) — `backend/railway.toml` đã có | ⬜ |
| 7.2 | Cập nhật `API_BASE_URL` trong `app.js` trỏ về Railway URL | ⬜ |
| 7.3 | Deploy frontend lên Vercel (kéo thư mục `frontend/`) — `frontend/vercel.json` đã có | ⬜ |
| 7.4 | Smoke test toàn bộ 4 trang trên production URL | ⬜ |

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
| D7 | Router hash-based (`#dashboard`, `#orders`, ...) | SPA đơn giản không cần server-side routing |

---

## Bước tiếp theo

**Bắt đầu từ Giai đoạn 1**, theo thứ tự:

1. Tạo cấu trúc thư mục và `requirements.txt`
2. Tạo project Supabase và chạy SQL khởi tạo bảng (mục 2.1–2.6)
3. Viết FastAPI app cơ bản và kết nối database
4. Hoàn thành từng nhóm API endpoint, test qua `/docs`
5. Xây frontend từ layout chung → từng trang → tích hợp API

> **Ưu tiên:** Backend API phải hoàn chỉnh và test được trước khi bắt đầu tích hợp frontend.
