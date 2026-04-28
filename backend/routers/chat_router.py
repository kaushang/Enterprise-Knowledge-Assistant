from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User, QueryHistory
from auth import decode_token
from rag import answer_question
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/chat", tags=["chat"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


class AskRequest(BaseModel):
    question: str


@router.post("/ask")
def ask(
    req: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    result = answer_question(req.question)

    history = QueryHistory(
        user_id=current_user.id,
        question=req.question,
        answer=result["answer"],
        sources=", ".join(result["sources"])
    )
    db.add(history)
    db.commit()

    return {"answer": result["answer"], "sources": result["sources"]}


@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    records = db.query(QueryHistory).filter(
        QueryHistory.user_id == current_user.id
    ).order_by(QueryHistory.created_at.desc()).all()

    return [
        {
            "question": r.question,
            "answer": r.answer,
            "sources": r.sources,
            "created_at": r.created_at
        }
        for r in records
    ]