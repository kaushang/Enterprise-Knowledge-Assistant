from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth_router, chat_router, admin_router
from database import engine, Base, SessionLocal
import models
from rag import reingest_all_documents

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Enterprise Knowledge Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://enterprise-knowledge-assistant-kappa.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(chat_router.router)
app.include_router(admin_router.router)

@app.on_event("startup")
def startup_reingestion():
    db = SessionLocal()
    try:
        documents = db.query(models.Document).all()
        doc_list = [
            {
                "filename": d.filename,
                "file_bytes": d.file_bytes,
            }
            for d in documents
        ]
        reingest_all_documents(doc_list)
    except Exception as e:
        print(f"Startup re-ingestion failed: {str(e)}")
    finally:
        db.close()

@app.get("/")
def root():
    return {"status": "running"}