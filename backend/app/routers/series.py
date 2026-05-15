from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from .library import _series_summary

router = APIRouter(prefix="/api/series", tags=["series"])


@router.get("/{series_id}")
def get_series(series_id: int, db: Session = Depends(get_db)):
    s = db.query(models.Series).get(series_id)
    if not s:
        raise HTTPException(404, "series not found")
    summary = _series_summary(db, s)
    chapters = []
    for c in s.chapters:
        p = db.query(models.Progress).filter_by(chapter_id=c.id).first()
        chapters.append({
            "id": c.id, "series_id": c.series_id,
            "number": c.number, "title": c.title,
            "page_count": c.page_count, "format": c.format,
            "progress_page": p.page if p else 0,
            "finished": bool(p.finished) if p else False,
            "read_at": p.read_at if p else None,
        })
    chapters.sort(key=lambda x: float(x["number"].replace("Ch.", "").replace("ch.", "").strip() or 0), reverse=True)

    bookmarks = (
        db.query(models.Bookmark).filter_by(series_id=series_id)
        .order_by(models.Bookmark.created_at.desc()).all()
    )
    summary["chapters"] = chapters
    summary["bookmarks"] = [{
        "id": b.id, "series_id": b.series_id, "chapter_id": b.chapter_id,
        "page": b.page, "note": b.note, "created_at": b.created_at,
    } for b in bookmarks]
    return summary


@router.patch("/{series_id}/shelf")
def set_shelf(series_id: int, body: dict, db: Session = Depends(get_db)):
    s = db.query(models.Series).get(series_id)
    if not s:
        raise HTTPException(404)
    s.shelf = body.get("shelf", s.shelf)
    db.commit()
    return {"ok": True, "shelf": s.shelf}
