# AKH Quán — Admin Dashboard

Web quản lý bán hàng cho cửa hàng ăn uống. 4 chức năng: Tổng quan, Tạo đơn hàng, Sản phẩm, Báo cáo.

**Stack:** Vanilla JS · FastAPI · PostgreSQL (Supabase) · Vercel + Railway

---

## Yêu cầu

- Python 3.10+
- Tài khoản [Supabase](https://supabase.com) (miễn phí)
- (Tuỳ chọn) VS Code + extension **Live Server** để chạy frontend

---

## 1. Khởi tạo Database trên Supabase

1. Tạo project mới tại [supabase.com](https://supabase.com)
2. Vào **SQL Editor** và chạy đoạn SQL sau:

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

3. Lấy thông tin kết nối từ **Project Settings → Database**:
   - `DATABASE_URL`: Connection string (URI)
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_KEY`: anon/public key

---

## 2. Cài đặt Backend

```bash
# Cài thư viện
pip install -r requirements.txt

# Tạo file .env từ mẫu
cp .env.example .env
# Điền DATABASE_URL, SUPABASE_URL, SUPABASE_KEY vào .env

# Chạy server (từ thư mục gốc project)
cd backend
uvicorn main:app --reload --port 8000
```

Kiểm tra API tại: `http://localhost:8000/docs`

---

## 3. Chạy Frontend

**Cách 1 — Live Server (khuyến nghị):**
- Mở VS Code, cài extension **Live Server**
- Chuột phải `frontend/index.html` → **Open with Live Server**
- Mặc định chạy tại `http://localhost:5500`

**Cách 2 — Python http.server:**
```bash
cd frontend
python -m http.server 5500
```

---

## 4. Deploy

### Backend → Railway

1. Tạo project tại [railway.app](https://railway.app)
2. Connect GitHub repo hoặc deploy trực tiếp từ thư mục `backend/`
3. Thêm biến môi trường: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, `CORS_ORIGINS`
4. Thêm `PORT=8000` hoặc để Railway tự cấu hình
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend → Vercel

1. Cập nhật `API_BASE` trong `frontend/app.js` sang Railway URL:
   ```js
   const API_BASE = 'https://your-app.railway.app';
   ```
2. Tạo project tại [vercel.com](https://vercel.com)
3. Deploy thư mục `frontend/` (chọn **Other** framework)
4. Thêm domain Vercel vào `CORS_ORIGINS` trong biến môi trường Railway

---

## Cấu trúc project

```
akh_webapp/
├── backend/
│   ├── main.py          # FastAPI app + CORS
│   ├── database.py      # Kết nối PostgreSQL
│   ├── models.py        # Pydantic schemas
│   └── routes/
│       ├── products.py
│       ├── customers.py
│       ├── orders.py
│       ├── dashboard.py
│       └── report.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
├── requirements.txt
└── README.md
```

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/products` | Danh sách sản phẩm (filter: `search`, `category`) |
| POST | `/products` | Thêm sản phẩm |
| PUT | `/products/{id}` | Cập nhật sản phẩm |
| DELETE | `/products/{id}` | Xoá sản phẩm |
| GET | `/customers` | Danh sách khách hàng (filter: `search`) |
| POST | `/customers` | Thêm khách hàng |
| GET | `/orders` | Danh sách đơn hàng |
| GET | `/orders/recent` | 10 đơn gần nhất |
| POST | `/orders` | Tạo đơn hàng |
| GET | `/dashboard/stats` | 4 chỉ số + delta hôm qua |
| GET | `/dashboard/revenue-chart` | Doanh thu 7 ngày |
| GET | `/report/monthly` | Báo cáo 12 tháng |
