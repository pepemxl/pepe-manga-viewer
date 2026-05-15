from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/library", tags=["library"])


def _series_summary(db: Session, s: models.Series) -> dict:
    chapter_count = (
        db.query(func.count(models.Chapter.id))
        .filter(models.Chapter.series_id == s.id)
        .scalar() or 0
    )
    finished = (
        db.query(func.count(models.Progress.id))
        .filter(models.Progress.series_id == s.id, models.Progress.finished == 1)
        .scalar() or 0
    )
    last = (
        db.query(func.max(models.Progress.read_at))
        .filter(models.Progress.series_id == s.id).scalar()
    )
    pct = int((finished / chapter_count) * 100) if chapter_count else 0
    return {
        "id": s.id, "title": s.title, "author": s.author,
        "description": s.description, "kind": s.kind, "direction": s.direction,
        "source_path": s.source_path, "format": s.format, "tags": s.tags,
        "shelf": s.shelf, "cover_url": s.cover_url,
        "chapter_count": chapter_count,
        "unread_count": max(chapter_count - finished, 0),
        "progress_pct": pct, "last_read_at": last,
        "added_at": s.added_at,
    }


@router.get("")
def list_library(
    shelf: Optional[str] = Query(default=None),
    kind: Optional[str] = Query(default=None),
    sort: str = Query(default="recent"),
    db: Session = Depends(get_db),
):
    q = db.query(models.Series)
    if shelf and shelf.lower() not in ("all", ""):
        q = q.filter(func.lower(models.Series.shelf) == shelf.lower())
    if kind:
        q = q.filter(models.Series.kind == kind)
    rows = q.all()
    items = [_series_summary(db, s) for s in rows]
    if sort == "title":
        items.sort(key=lambda x: x["title"].lower())
    elif sort == "progress":
        items.sort(key=lambda x: x["progress_pct"], reverse=True)
    else:  # recent
        items.sort(
            key=lambda x: x["last_read_at"] or x["added_at"] or datetime.min,
            reverse=True,
        )
    return {"items": items, "count": len(items)}


@router.get("/shelves")
def list_shelves(db: Session = Depends(get_db)):
    shelves = db.query(models.Shelf).all()
    out = []
    for s in shelves:
        if s.kind == "system":
            if s.name.lower() == "all":
                cnt = db.query(func.count(models.Series.id)).scalar() or 0
            else:
                cnt = (
                    db.query(func.count(models.Series.id))
                    .filter(func.lower(models.Series.shelf) == s.name.lower())
                    .scalar() or 0
                )
        else:
            cnt = 0
        out.append({"id": s.id, "name": s.name, "kind": s.kind, "count": cnt})
    return {"items": out}


@router.get("/sources")
def list_sources(db: Session = Depends(get_db)):
    rows = db.query(models.Source).all()
    out = []
    for r in rows:
        cnt = db.query(func.count(models.Series.id)).filter(
            models.Series.source_id == r.id
        ).scalar() or 0
        out.append({
            "id": r.id, "path": r.path, "enabled": int(r.enabled),
            "last_scan_at": r.last_scan_at, "count": cnt,
        })
    return {"items": out}
