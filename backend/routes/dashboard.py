from fastapi import APIRouter
from database import get_conn
from models import DashboardStats, RevenuePoint

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats():
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Doanh thu hôm nay và hôm qua (bỏ đơn huỷ)
            cur.execute("""
                SELECT
                    COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE THEN total_amount END), 0)     AS revenue_today,
                    COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE - 1 THEN total_amount END), 0) AS revenue_yesterday
                FROM orders
                WHERE status != 'huy'
            """)
            rev = cur.fetchone()
            revenue_today = float(rev["revenue_today"])
            revenue_yesterday = float(rev["revenue_yesterday"])

            if revenue_yesterday > 0:
                revenue_delta = round((revenue_today - revenue_yesterday) / revenue_yesterday * 100, 1)
            elif revenue_today > 0:
                revenue_delta = 100.0
            else:
                revenue_delta = 0.0

            # Số đơn hôm nay và hôm qua
            cur.execute("""
                SELECT
                    COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END)     AS today,
                    COUNT(CASE WHEN created_at::date = CURRENT_DATE - 1 THEN 1 END) AS yesterday
                FROM orders
            """)
            ord_row = cur.fetchone()
            new_orders = int(ord_row["today"])
            orders_delta = new_orders - int(ord_row["yesterday"])

            # Tổng sản phẩm
            cur.execute("SELECT COUNT(*) AS cnt FROM products")
            total_products = int(cur.fetchone()["cnt"])

            # Khách mới hôm nay và hôm qua
            cur.execute("""
                SELECT
                    COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END)     AS today,
                    COUNT(CASE WHEN created_at::date = CURRENT_DATE - 1 THEN 1 END) AS yesterday
                FROM customers
            """)
            cust_row = cur.fetchone()
            new_customers = int(cust_row["today"])
            customers_delta = new_customers - int(cust_row["yesterday"])

            return DashboardStats(
                revenue_today=revenue_today,
                revenue_delta=revenue_delta,
                new_orders=new_orders,
                orders_delta=orders_delta,
                total_products=total_products,
                new_customers=new_customers,
                customers_delta=customers_delta,
            )


@router.get("/revenue-chart", response_model=list[RevenuePoint])
def revenue_chart():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    gs.day::date                    AS date,
                    COALESCE(SUM(o.total_amount), 0) AS revenue
                FROM generate_series(
                    CURRENT_DATE - INTERVAL '6 days',
                    CURRENT_DATE,
                    INTERVAL '1 day'
                ) AS gs(day)
                LEFT JOIN orders o
                    ON o.created_at::date = gs.day::date
                    AND o.status != 'huy'
                GROUP BY gs.day
                ORDER BY gs.day
            """)
            return [
                RevenuePoint(date=str(row["date"]), revenue=float(row["revenue"]))
                for row in cur.fetchall()
            ]
