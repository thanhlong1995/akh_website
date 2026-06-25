from fastapi import APIRouter, HTTPException
from database import get_conn
from models import Customer, CustomerCreate

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[Customer])
def list_customers(search: str = ""):
    with get_conn() as conn:
        with conn.cursor() as cur:
            if search:
                cur.execute(
                    "SELECT * FROM customers WHERE LOWER(name) LIKE LOWER(%s) OR phone LIKE %s ORDER BY created_at DESC",
                    (f"%{search}%", f"%{search}%"),
                )
            else:
                cur.execute("SELECT * FROM customers ORDER BY created_at DESC")
            return cur.fetchall()


@router.post("", response_model=Customer, status_code=201)
def create_customer(body: CustomerCreate):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO customers (name, phone) VALUES (%s, %s) RETURNING *",
                (body.name, body.phone),
            )
            return cur.fetchone()
