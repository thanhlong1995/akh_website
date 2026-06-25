import hmac
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

app = FastAPI(title="AKH Quán API", version="1.0.0")

# CORS — cho phép Vercel frontend và local dev server
_default_origins = (
    "https://akhwebsites.vercel.app,"
    "http://localhost:5500,"
    "http://127.0.0.1:5500"
)
_raw_origins = os.getenv("CORS_ORIGINS", _default_origins)
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes sau khi app được khởi tạo (tránh circular import)
from routes import products, customers, orders, dashboard, report, auth  # noqa: E402
from routes.auth import SESSION_TOKEN  # noqa: E402

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)
app.include_router(report.router)

# Các path không cần xác thực
_PUBLIC = {"/auth/login", "/health", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path in _PUBLIC or request.method == "OPTIONS":
        return await call_next(request)
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(token, SESSION_TOKEN):
        return JSONResponse(status_code=401, content={"detail": "Chưa đăng nhập"})
    return await call_next(request)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "SUPABASE_URL": bool(os.getenv("SUPABASE_URL")),
        "DATABASE_URL": bool(os.getenv("DATABASE_URL")),
    }
