from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth_router, chat_router, admin_router
from database import engine, Base
import models

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Enterprise Knowledge Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "https://enterprise-knowledge-assistant-kappa.vercel.app"],
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