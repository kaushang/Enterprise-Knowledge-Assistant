from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import User, Document
from auth import decode_token
from rag import ingest_document
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()

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


@router.post("/upload")
async def upload_document(

    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    if not (file.filename.endswith(".pdf") or file.filename.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported")
    print(2)

    file_bytes = await file.read()
    print(3)

    try:
        print(4)
        chunk_count = ingest_document(file_bytes, file.filename)
        print(5)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    doc = Document(
        filename=file.filename,
        uploaded_by=current_user.id,
        chunk_count=chunk_count
    )
    print(8)
    db.add(doc)
    print(9)
    db.commit()
    print(10)

    return {"filename": file.filename, "chunks_created": chunk_count, "message": "Document uploaded successfully"}


@router.get("/documents")
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    docs = db.query(Document).all()
    return [
        {
            "filename": d.filename,
            "chunk_count": d.chunk_count,
            "uploaded_at": d.uploaded_at
        }
        for d in docs
    ]