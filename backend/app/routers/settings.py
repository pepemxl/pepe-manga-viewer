from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/settings", tags=["settings"])


class KV(BaseModel):
    key: str
    value: str


@router.get("")
def list_settings(db: Session = Depends(get_db)):
    rows = db.query(models.Setting).all()
    return {r.k: r.v for r in rows}


@router.post("")
def upsert(body: KV, db: Session = Depends(get_db)):
    row = db.query(models.Setting).filter_by(k=body.key).first()
    if row:
        row.v = body.value
    else:
        db.add(models.Setting(k=body.key, v=body.value))
    db.commit()
    return {"ok": True, "key": body.key, "value": body.value}


@router.post("/bulk")
def upsert_bulk(body: dict[str, str], db: Session = Depends(get_db)):
    for k, v in body.items():
        row = db.query(models.Setting).filter_by(k=k).first()
        if row:
            row.v = str(v)
        else:
            db.add(models.Setting(k=k, v=str(v)))
    db.commit()
    return {"ok": True, "count": len(body)}
