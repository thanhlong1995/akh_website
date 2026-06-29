from fastapi import APIRouter, HTTPException
from database import get_conn
from models import Order, OrderCreate, OrderSummary, OrderDetail, OrderItemDetail, OrderStatusUpdate

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


@router.get("/{order_id}", response_model=OrderDetail)
def get_order(order_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Query 1: header đơn hàng
            cur.execute("""
                SELECT o.id, o.total_amount, o.status, o.created_at,
                       c.name AS customer_name
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.id = %s
            """, (order_id,))
            order = cur.fetchone()
            if not order:
                raise HTTPException(404, "Không tìm thấy đơn hàng")

            # Query 2: danh sách món (có thể rỗng)
            cur.execute("""
                SELECT p.name AS product_name,
                       oi.quantity, oi.unit_price,
                       (oi.quantity * oi.unit_price) AS subtotal
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = %s
                ORDER BY oi.id
            """, (order_id,))
            items = cur.fetchall()

            return OrderDetail(
                id=order["id"],
                customer_name=order["customer_name"],
                total_amount=float(order["total_amount"]),
                status=order["status"],
                created_at=order["created_at"],
                items=[
                    OrderItemDetail(
                        product_name=row["product_name"],
                        quantity=float(row["quantity"]),
                        unit_price=float(row["unit_price"]),
                        subtotal=float(row["subtotal"]),
                    )
                    for row in items
                ]
            )


@router.put("/{order_id}")
def update_order_status(order_id: int, body: OrderStatusUpdate):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE orders SET status = %s WHERE id = %s RETURNING id",
                (body.status, order_id),
            )
            if not cur.fetchone():
                raise HTTPException(404, "Không tìm thấy đơn hàng")
    return {"ok": True}


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
