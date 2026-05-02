from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import User, Document
from auth import decode_token
from rag import ingest_document
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()

CATEGORIES = [
    "General",
    "Legal Policies",
    "Joining Policies",
    "Leaving Policies",
    "HR Policies",
    "Finance Policies",
    "IT Policies",
]

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/categories")
def get_categories():
    return {"categories": CATEGORIES}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: Optional[str] = Form("General"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    if not (file.filename.endswith(".pdf") or file.filename.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported")

    file_bytes = await file.read()

    try:
        chunk_count = ingest_document(file_bytes, file.filename)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    doc = Document(
        filename=file.filename,
        uploaded_by=current_user.id,
        chunk_count=chunk_count,
        category=category or "General"
    )
    db.add(doc)
    db.commit()

    return {"filename": file.filename, "chunks_created": chunk_count, "message": "Document uploaded successfully"}


@router.get("/documents")
def list_documents(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Document)
    if category and category != "All":
        query = query.filter(Document.category == category)
    docs = query.all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "chunk_count": d.chunk_count,
            "category": d.category,
            "uploaded_at": d.uploaded_at
        }
        for d in docs
    ]