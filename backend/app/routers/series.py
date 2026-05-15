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
    summary["collections"] = [
        {"id": c.id, "name": c.name} for c in s.collections if c.kind == "collection"
    ]
    return summary


@router.patch("/{series_id}/shelf")
def set_shelf(series_id: int, body: dict, db: Session = Depends(get_db)):
    s = db.query(models.Series).get(series_id)
    if not s:
        raise HTTPException(404)
    s.shelf = body.get("shelf", s.shelf)
    db.commit()
    return {"ok": True, "shelf": s.shelf}


ALLOWED_MODES = {"single", "double", "vertical", "horizontal"}
ALLOWED_DIRS  = {"LTR", "RTL", "vert"}
ALLOWED_FITS  = {"width", "height", "original", "smart"}
ZOOM_MIN, ZOOM_MAX = 0.25, 4.0


@router.patch("/{series_id}/reader-config")
def set_reader_config(series_id: int, body: dict, db: Session = Depends(get_db)):
    s = db.query(models.Series).get(series_id)
    if not s:
        raise HTTPException(404)
    if "reading_mode" in body and body["reading_mode"] in ALLOWED_MODES:
        s.reading_mode = body["reading_mode"]
    if "direction" in body and body["direction"] in ALLOWED_DIRS:
        s.direction = body["direction"]
    if "fit" in body and body["fit"] in ALLOWED_FITS:
        s.fit = body["fit"]
    if "zoom" in body:
        raw = body["zoom"]
        if raw is None:
            s.zoom = None
        else:
            try:
                z = float(raw)
            except (TypeError, ValueError):
                raise HTTPException(400, "zoom must be a number")
            if not (ZOOM_MIN <= z <= ZOOM_MAX):
                raise HTTPException(400, f"zoom out of range [{ZOOM_MIN}, {ZOOM_MAX}]")
            s.zoom = round(z, 2)
    db.commit()
    return {
        "ok": True,
        "reading_mode": s.reading_mode,
        "direction": s.direction,
        "fit": s.fit,
        "zoom": float(s.zoom) if s.zoom is not None else None,
    }
