import os
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


@contextmanager
def get_conn():
    # Truyền sslmode=require qua kwargs (Supabase bắt buộc SSL)
    ssl = {} if "sslmode" in (DATABASE_URL or "") else {"sslmode": "require"}
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor, **ssl)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
