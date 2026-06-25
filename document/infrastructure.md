# Infrastructure — AKH Quán Admin Dashboard

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | HTML + CSS + Vanilla JavaScript (không dùng framework) |
| Backend   | Python FastAPI                      |
| Database  | PostgreSQL (qua Supabase)           |
| Hosting   | Frontend → Vercel, Backend → Railway |

---

## Cấu trúc file

```
frontend/
  index.html
  style.css
  app.js

backend/
  main.py
  models.py
  routes/

.env.example
requirements.txt
README.md
```

---

## API Endpoints (FastAPI)

| Method | Endpoint              | Mô tả                                          |
|--------|-----------------------|------------------------------------------------|
| POST   | /auth/login           | Đăng nhập — trả về `{"token": "..."}` (public) |
| GET    | /products             | Lấy danh sách sản phẩm                        |
| POST   | /products             | Thêm sản phẩm mới                             |
| PUT    | /products/{id}        | Cập nhật sản phẩm                             |
| DELETE | /products/{id}        | Xoá sản phẩm                                  |
| GET    | /orders               | Lấy danh sách đơn hàng                        |
| POST   | /orders               | Tạo đơn hàng mới                              |
| GET    | /orders/recent        | 10 đơn hàng gần nhất                          |
| GET    | /customers            | Lấy danh sách khách hàng                      |
| POST   | /customers            | Thêm khách hàng mới                           |
| GET    | /dashboard/stats      | Doanh thu hôm nay, đơn mới, tổng sản phẩm, khách mới (kèm delta hôm qua) |
| GET    | /dashboard/revenue-chart | Doanh thu 7 ngày gần nhất — trả về mảng `[{date, revenue}]`        |
| GET    | /report/monthly       | Doanh thu 12 tháng, tổng đơn, giá trị TB mỗi đơn                         |

---

## Request / Response bodies quan trọng

### `POST /orders` — Tạo đơn hàng

**Request body:**
```json
{
  "customer_id": 1,
  "items": [
    { "product_id": 3, "quantity": 2 },
    { "product_id": 7, "quantity": 0.5 }
  ]
}
```
- `customer_id` là tuỳ chọn (nullable) — bỏ qua nếu không ghi nhận khách
- `quantity`: số nguyên cho đơn vị `con`, 1 chữ số thập phân cho `kg`
- Backend tự tính `total_amount` và snapshot `unit_price` từ giá sản phẩm hiện tại
- Trạng thái mặc định khi tạo: `xu_ly`

**Response:** đơn hàng vừa tạo kèm danh sách items

---

## Yêu cầu file cấu hình

- `.env.example`: bao gồm các biến `DATABASE_URL`, `SUPABASE_KEY`, ...
- `backend/routes/auth.py`: hash SHA-256 của password admin được tính tại module-load, không lưu DB
- Middleware `auth_middleware` trong `main.py`: bảo vệ tất cả routes trừ `/auth/login`, `/health`, `/docs`
- `requirements.txt`: danh sách thư viện Python
- `README.md`: hướng dẫn cài đặt và chạy local
