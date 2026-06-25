from datetime import date

from fastapi import APIRouter
from database import get_conn
from models import MonthlyReport, MonthlyPoint

router = APIRouter(prefix="/report", tags=["report"])


@router.get("/monthly", response_model=MonthlyReport)
def monthly_report():
    today = date.today()
    year = today.year

    with get_conn() as conn:
        with conn.cursor() as cur:
            # Biểu đồ 12 tháng trong năm hiện tại
            cur.execute("""
                SELECT
                    gs.month,
                    COALESCE(SUM(o.total_amount), 0) AS revenue
                FROM generate_series(1, 12) AS gs(month)
                LEFT JOIN orders o
                    ON EXTRACT(MONTH FROM o.created_at) = gs.month
                    AND EXTRACT(YEAR  FROM o.created_at) = %s
                    AND o.status != 'huy'
                GROUP BY gs.month
                ORDER BY gs.month
            """, (year,))
            chart = [
                MonthlyPoint(month=int(row["month"]), revenue=float(row["revenue"]))
                for row in cur.fetchall()
            ]

            # Chỉ số tháng hiện tại
            cur.execute("""
                SELECT
                    COALESCE(SUM(total_amount), 0)  AS revenue,
                    COUNT(*)                         AS total_orders,
                    COALESCE(AVG(total_amount), 0)   AS avg_order_value
                FROM orders
                WHERE EXTRACT(MONTH FROM created_at) = %s
                  AND EXTRACT(YEAR  FROM created_at) = %s
                  AND status != 'huy'
            """, (today.month, year))
            stats = cur.fetchone()

            return MonthlyReport(
                year=year,
                revenue_this_month=float(stats["revenue"]),
                total_orders=int(stats["total_orders"]),
                avg_order_value=float(stats["avg_order_value"]),
                chart=chart,
            )
