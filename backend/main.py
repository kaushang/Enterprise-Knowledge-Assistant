import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth_router, chat_router, admin_router
from database import engine, Base
import models

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Enterprise Knowledge Assistant")

allowed_origins = [
    "http://localhost:5174",
    "http://localhost:5173",
    "https://enterprise-knowledge-assistant-kappa.vercel.app",
]

extra_origins = os.getenv("FRONTEND_ORIGINS")
if extra_origins:
    allowed_origins.extend([origin.strip() for origin in extra_origins.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(chat_router.router)
app.include_router(admin_router.router)

@app.get("/")
def root():
    return {"status": "running"}