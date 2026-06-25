# Database Schema — AKH Quán Admin Dashboard

**Engine:** PostgreSQL (hosted trên Supabase)

---

## Tables

### `products`
| Column       | Type        | Ghi chú                                      |
|--------------|-------------|----------------------------------------------|
| id           | serial PK   |                                              |
| name         | varchar     | Tên món                                      |
| category     | varchar     | `'mon_an'` \| `'mon_nuoc'` \| `'bia_nuoc_ngot'` |
| unit         | varchar     | `'con'` \| `'kg'` — đơn vị tính             |
| price        | numeric     | Giá bán (VND)                                |
| created_at   | timestamp   | Mặc định `now()`                             |

### `customers`
| Column       | Type        | Ghi chú              |
|--------------|-------------|----------------------|
| id           | serial PK   |                      |
| name         | varchar     | Tên khách hàng       |
| phone        | varchar     | Số điện thoại        |
| created_at   | timestamp   | Mặc định `now()`     |

### `orders`
| Column        | Type        | Ghi chú                                                                 |
|---------------|-------------|-------------------------------------------------------------------------|
| id            | serial PK   |                                                                         |
| customer_id   | int FK NULL | Tham chiếu `customers.id` — NULL nếu không ghi nhận khách               |
| total_amount  | numeric     | Tổng tiền đơn hàng (VND)                                                |
| status        | varchar     | `'xu_ly'` \| `'dang_giao'` \| `'da_giao'` \| `'huy'` — mặc định `'xu_ly'` |
| created_at    | timestamp   | Mặc định `now()`                                                        |

### `order_items`
| Column       | Type        | Ghi chú                      |
|--------------|-------------|------------------------------|
| id           | serial PK   |                              |
| order_id     | int FK      | Tham chiếu `orders.id`       |
| product_id   | int FK      | Tham chiếu `products.id`     |
| quantity     | numeric     | Số lượng (int cho con, 1 decimal cho kg)     |
| unit_price   | numeric     | Giá tại thời điểm đặt (VND)  |

---

## Quan hệ

```
customers ──< orders ──< order_items >── products
```

- Một khách hàng có thể có nhiều đơn hàng
- Một đơn hàng có nhiều order_items
- Mỗi order_item ghi lại `unit_price` riêng (snapshot giá tại thời điểm đặt, không phụ thuộc giá hiện tại của product)
