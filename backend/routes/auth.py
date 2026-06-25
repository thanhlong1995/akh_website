import hashlib
import hmac
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD_HASH = hashlib.sha256(b"admin123").hexdigest()
SESSION_TOKEN     = hashlib.sha256(b"akh_shop_session_key_2024").hexdigest()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: LoginRequest):
    pw_hash = hashlib.sha256(body.password.encode()).hexdigest()
    if body.username != ADMIN_USERNAME or not hmac.compare_digest(pw_hash, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")
    return {"token": SESSION_TOKEN}
