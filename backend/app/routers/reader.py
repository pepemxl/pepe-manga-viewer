from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import models, scanner
from ..database import get_db

router = APIRouter(prefix="/api/reader", tags=["reader"])


@router.get("/chapter/{chapter_id}")
def chapter_info(chapter_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Chapter).get(chapter_id)
    if not c:
        raise HTTPException(404)
    pages = scanner.list_pages(c)
    p = db.query(models.Progress).filter_by(chapter_id=c.id).first()
    s = db.query(models.Series).get(c.series_id)
    return {
        "id": c.id, "series_id": c.series_id, "number": c.number, "title": c.title,
        "page_count": len(pages),
        "page_urls": [f"/api/reader/page/{c.id}/{i}" for i in range(len(pages))],
        "current_page": p.page if p else 1,
        "direction": s.direction if s else "RTL",
        "kind": s.kind if s else "manga",
    }


@router.get("/page/{chapter_id}/{idx}")
def get_page(chapter_id: int, idx: int, db: Session = Depends(get_db)):
    c = db.query(models.Chapter).get(chapter_id)
    if not c:
        raise HTTPException(404)
    result = scanner.read_page_bytes(c, idx)
    if not result:
        raise HTTPException(404, "page not found")
    data, mime = result
    return Response(content=data, media_type=mime, headers={
        "Cache-Control": "public, max-age=3600",
    })


@router.get("/series/{series_id}/neighbors/{chapter_id}")
def chapter_neighbors(series_id: int, chapter_id: int, db: Session = Depends(get_db)):
    """Return prev/next chapter id within the series, sorted by number_sort."""
    chs = (
        db.query(models.Chapter)
        .filter_by(series_id=series_id)
        .order_by(models.Chapter.number_sort.asc()).all()
    )
    ids = [c.id for c in chs]
    if chapter_id not in ids:
        raise HTTPException(404)
    i = ids.index(chapter_id)
    return {
        "prev": ids[i - 1] if i > 0 else None,
        "next": ids[i + 1] if i + 1 < len(ids) else None,
        "index": i, "total": len(ids),
    }
