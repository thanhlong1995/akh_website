from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


# ─── Products ────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    category: Literal["mon_an", "mon_nuoc", "bia_nuoc_ngot"]
    unit: Literal["con", "kg", "lon"]
    price: float


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[Literal["mon_an", "mon_nuoc", "bia_nuoc_ngot"]] = None
    unit: Optional[Literal["con", "kg", "lon"]] = None
    price: Optional[float] = None


class Product(ProductCreate):
    id: int
    created_at: datetime


# ─── Customers ───────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None


class Customer(CustomerCreate):
    id: int
    created_at: datetime


# ─── Orders ──────────────────────────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: float


class OrderCreate(BaseModel):
    customer_id: Optional[int] = None
    items: list[OrderItemCreate]


class OrderItem(BaseModel):
    id: int
    product_id: int
    quantity: float
    unit_price: float


class Order(BaseModel):
    id: int
    customer_id: Optional[int]
    total_amount: float
    status: Literal["xu_ly", "dang_giao", "da_giao", "huy"]
    created_at: datetime
    items: list[OrderItem] = []


class OrderSummary(BaseModel):
    """Dùng cho bảng đơn gần đây — không cần danh sách items."""
    id: int
    customer_name: Optional[str]
    total_amount: float
    status: Literal["xu_ly", "dang_giao", "da_giao", "huy"]
    created_at: datetime


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    revenue_today: float
    revenue_delta: float        # % thay đổi so với hôm qua
    new_orders: int
    orders_delta: int           # số đơn chênh so với hôm qua
    total_products: int
    new_customers: int
    customers_delta: int        # số khách mới chênh so với hôm qua


class RevenuePoint(BaseModel):
    date: str                   # định dạng YYYY-MM-DD
    revenue: float


# ─── Report ──────────────────────────────────────────────────────────────────

class MonthlyPoint(BaseModel):
    month: int                  # 1–12
    revenue: float


class MonthlyReport(BaseModel):
    year: int
    revenue_this_month: float
    total_orders: int
    avg_order_value: float
    chart: list[MonthlyPoint]   # 12 phần tử, T1–T12
