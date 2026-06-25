from fastapi import APIRouter, HTTPException
from database import get_conn
from models import Order, OrderCreate, OrderSummary

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/recent", response_model=list[OrderSummary])
def recent_orders():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT o.id, c.name AS customer_name, o.total_amount, o.status, o.created_at
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                ORDER BY o.created_at DESC
                LIMIT 10
            """)
            return cur.fetchall()


@router.get("", response_model=list[OrderSummary])
def list_orders():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT o.id, c.name AS customer_name, o.total_amount, o.status, o.created_at
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                ORDER BY o.created_at DESC
            """)
            return cur.fetchall()


@router.post("", response_model=Order, status_code=201)
def create_order(body: OrderCreate):
    if not body.items:
        raise HTTPException(400, "Đơn hàng phải có ít nhất 1 món")

    with get_conn() as conn:
        with conn.cursor() as cur:
            # Snapshot giá tại thời điểm đặt
            product_ids = [item.product_id for item in body.items]
            cur.execute(
                "SELECT id, price FROM products WHERE id = ANY(%s)",
                (product_ids,),
            )
            price_map = {row["id"]: float(row["price"]) for row in cur.fetchall()}

            missing = [pid for pid in product_ids if pid not in price_map]
            if missing:
                raise HTTPException(404, f"Không tìm thấy sản phẩm id: {missing}")

            total = sum(price_map[item.product_id] * item.quantity for item in body.items)

            cur.execute(
                "INSERT INTO orders (customer_id, total_amount) VALUES (%s, %s) RETURNING *",
                (body.customer_id, total),
            )
            order = dict(cur.fetchone())

            items_result = []
            for item in body.items:
                cur.execute(
                    """INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                       VALUES (%s, %s, %s, %s) RETURNING *""",
                    (order["id"], item.product_id, item.quantity, price_map[item.product_id]),
                )
                items_result.append(dict(cur.fetchone()))

            order["items"] = items_result
            return order
