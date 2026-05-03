import json
import os
import secrets
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from fastapi import APIRouter, Depends, HTTPException, Request as FastAPIRequest
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_SCOPES = "openid email profile"
GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state"
GOOGLE_OAUTH_STATE_MAX_AGE = 600

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8001/auth/google/callback",
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    department: str = None
    role: str = "employee"

class LoginRequest(BaseModel):
    email: str
    password: str


def user_payload(user: User) -> dict:
    return {"name": user.name, "email": user.email, "role": user.role}


def create_auth_response(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_payload(user),
    }


def frontend_oauth_redirect(fragment: bool = False, **params: str) -> RedirectResponse:
    query = urlencode(params)
    separator = "#" if fragment else "?"
    return RedirectResponse(f"{FRONTEND_URL}/oauth/callback{separator}{query}")


def require_google_oauth_config() -> None:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth is not configured on the server",
        )


def post_google_token(code: str) -> dict:
    body = urlencode(
        {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")
    request = Request(
        GOOGLE_TOKEN_URL,
        data=body,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not complete Google OAuth token exchange",
        ) from exc


def get_google_userinfo(access_token: str) -> dict:
    request = Request(
        GOOGLE_USERINFO_URL,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {access_token}",
        },
    )

    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not fetch Google account profile",
        ) from exc

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
        department=req.department,
        role=req.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created successfully"}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return create_auth_response(user)


@router.get("/google/login")
def google_login():
    require_google_oauth_config()

    state = secrets.token_urlsafe(32)
    params = urlencode(
        {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": GOOGLE_SCOPES,
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }
    )
    response = RedirectResponse(f"{GOOGLE_AUTH_URL}?{params}")
    response.set_cookie(
        GOOGLE_OAUTH_STATE_COOKIE,
        state,
        max_age=GOOGLE_OAUTH_STATE_MAX_AGE,
        httponly=True,
        secure=GOOGLE_REDIRECT_URI.startswith("https://"),
        samesite="lax",
    )
    return response


@router.get("/google/callback")
def google_callback(
    request: FastAPIRequest,
    code: str = None,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db),
):
    if error:
        return frontend_oauth_redirect(error=error)

    expected_state = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)
    if not code or not state or not expected_state or state != expected_state:
        return frontend_oauth_redirect(error="Invalid Google OAuth state")

    try:
        require_google_oauth_config()
        token_data = post_google_token(code)
        google_access_token = token_data.get("access_token")
        if not google_access_token:
            raise HTTPException(status_code=400, detail="Google did not return an access token")

        profile = get_google_userinfo(google_access_token)
        email = profile.get("email")
        email_verified = profile.get("email_verified")
        if not email or email_verified is not True:
            raise HTTPException(status_code=400, detail="Google email is not verified")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=profile.get("name") or email.split("@")[0],
                email=email,
                hashed_password=hash_password(secrets.token_urlsafe(32)),
                role="employee",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        auth_response = create_auth_response(user)
        response = frontend_oauth_redirect(
            fragment=True,
            access_token=auth_response["access_token"],
            token_type=auth_response["token_type"],
            user=json.dumps(auth_response["user"]),
        )
    except HTTPException as exc:
        response = frontend_oauth_redirect(error=exc.detail)

    response.delete_cookie(GOOGLE_OAUTH_STATE_COOKIE)
    return response
