from fastapi import APIRouter, HTTPException
from psycopg2.errors import ForeignKeyViolation
from database import get_conn
from models import Product, ProductCreate, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[Product])
def list_products(search: str = "", category: str = ""):
    with get_conn() as conn:
        with conn.cursor() as cur:
            query = "SELECT * FROM products WHERE 1=1"
            params: list = []
            if search:
                query += " AND LOWER(name) LIKE LOWER(%s)"
                params.append(f"%{search}%")
            if category:
                query += " AND category = %s"
                params.append(category)
            query += " ORDER BY name ASC"
            cur.execute(query, params)
            return cur.fetchall()


@router.post("", response_model=Product, status_code=201)
def create_product(body: ProductCreate):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO products (name, category, unit, price) VALUES (%s, %s, %s, %s) RETURNING *",
                (body.name, body.category, body.unit, body.price),
            )
            return cur.fetchone()


@router.put("/{product_id}", response_model=Product)
def update_product(product_id: int, body: ProductUpdate):
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(400, "Không có trường nào để cập nhật")
    set_clause = ", ".join(f"{k} = %s" for k in fields)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE products SET {set_clause} WHERE id = %s RETURNING *",
                (*fields.values(), product_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Không tìm thấy sản phẩm")
            return row


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM products WHERE id = %s RETURNING id", (product_id,))
                if not cur.fetchone():
                    raise HTTPException(404, "Không tìm thấy sản phẩm")
    except ForeignKeyViolation:
        raise HTTPException(409, "Không thể xoá sản phẩm đã có trong đơn hàng")
