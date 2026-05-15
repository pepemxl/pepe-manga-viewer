from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/chapters", tags=["chapters"])


@router.get("/{chapter_id}")
def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Chapter).get(chapter_id)
    if not c:
        raise HTTPException(404)
    p = db.query(models.Progress).filter_by(chapter_id=c.id).first()
    return {
        "id": c.id, "series_id": c.series_id, "number": c.number,
        "title": c.title, "page_count": c.page_count, "format": c.format,
        "progress_page": p.page if p else 0,
        "finished": bool(p.finished) if p else False,
    }


@router.post("/{chapter_id}/progress")
def update_progress(chapter_id: int, body: schemas.ProgressIn, db: Session = Depends(get_db)):
    c = db.query(models.Chapter).get(chapter_id)
    if not c:
        raise HTTPException(404)
    p = db.query(models.Progress).filter_by(chapter_id=chapter_id).first()
    page = max(1, min(body.page, max(c.page_count, 1)))
    finished = body.finished if body.finished is not None else (page >= c.page_count)
    if not p:
        p = models.Progress(
            series_id=c.series_id, chapter_id=c.id, page=page,
            finished=1 if finished else 0,
        )
        db.add(p)
    else:
        p.page = page
        p.finished = 1 if finished else 0
        p.read_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "page": p.page, "finished": bool(p.finished)}
