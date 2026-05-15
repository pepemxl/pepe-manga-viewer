from datetime import datetime, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/in-progress")
def in_progress(db: Session = Depends(get_db)):
    """List series currently being read — sorted by last_read_at desc."""
    rows = (
        db.query(models.Progress, models.Chapter, models.Series)
        .join(models.Chapter, models.Chapter.id == models.Progress.chapter_id)
        .join(models.Series, models.Series.id == models.Progress.series_id)
        .filter(models.Progress.finished == 0)
        .order_by(models.Progress.read_at.desc())
        .limit(20).all()
    )
    items = []
    seen = set()
    for p, c, s in rows:
        if s.id in seen:
            continue
        seen.add(s.id)
        pct = int((p.page / max(c.page_count, 1)) * 100)
        items.append({
            "series_id": s.id, "title": s.title, "kind": s.kind,
            "chapter_id": c.id, "chapter": c.number, "page": p.page,
            "page_count": c.page_count,
            "progress_pct": pct, "last_read_at": p.read_at,
        })
    return {"items": items}


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)

    pages_month = (
        db.query(func.coalesce(func.sum(models.Progress.page), 0))
        .filter(models.Progress.read_at >= month_ago).scalar() or 0
    )
    chapters_month = (
        db.query(func.count(models.Progress.id))
        .filter(models.Progress.finished == 1, models.Progress.read_at >= month_ago)
        .scalar() or 0
    )

    # streak — count consecutive days with at least 1 progress update, ending today
    day_set = {
        d.date() for (d,) in db.query(models.Progress.read_at).filter(
            models.Progress.read_at >= now - timedelta(days=120)
        ).all() if d
    }
    streak = 0
    cursor = now.date()
    while cursor in day_set:
        streak += 1
        cursor -= timedelta(days=1)

    # longest streak — within the lookback
    longest = 0
    if day_set:
        sorted_days = sorted(day_set)
        run = 1
        for i in range(1, len(sorted_days)):
            if (sorted_days[i] - sorted_days[i - 1]).days == 1:
                run += 1
                longest = max(longest, run)
            else:
                run = 1
        longest = max(longest, run)

    # pages per day (last 30 days)
    bucket: dict = defaultdict(int)
    for (d, pg) in db.query(models.Progress.read_at, models.Progress.page).filter(
        models.Progress.read_at >= month_ago
    ).all():
        if d:
            bucket[d.date()] += pg
    pages_per_day = [
        bucket.get((now - timedelta(days=29 - i)).date(), 0)
        for i in range(30)
    ]

    # by type
    by_kind_rows = (
        db.query(models.Series.kind, func.count(models.Series.id))
        .group_by(models.Series.kind).all()
    )
    total = sum(c for _, c in by_kind_rows) or 1
    by_type = [
        {"label": k or "other", "pct": int((c / total) * 100)}
        for k, c in by_kind_rows
    ]

    recent_finishes = []
    rows = (
        db.query(models.Progress, models.Chapter, models.Series)
        .join(models.Chapter, models.Chapter.id == models.Progress.chapter_id)
        .join(models.Series, models.Series.id == models.Progress.series_id)
        .filter(models.Progress.finished == 1)
        .order_by(models.Progress.read_at.desc()).limit(5).all()
    )
    for p, c, s in rows:
        recent_finishes.append({
            "series_id": s.id, "title": s.title,
            "chapter": c.number, "at": p.read_at,
        })

    return {
        "pages_month": int(pages_month),
        "chapters_month": int(chapters_month),
        "streak_days": streak,
        "longest_streak": longest,
        "minutes_month": int(chapters_month * 8),  # rough estimate
        "pages_per_day": pages_per_day,
        "by_type": by_type,
        "recent_finishes": recent_finishes,
    }


@router.get("/timeline")
def timeline(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Progress, models.Chapter, models.Series)
        .join(models.Chapter, models.Chapter.id == models.Progress.chapter_id)
        .join(models.Series, models.Series.id == models.Progress.series_id)
        .order_by(models.Progress.read_at.desc()).limit(40).all()
    )
    items = [{
        "series_id": s.id, "title": s.title,
        "chapter_id": c.id, "chapter": c.number,
        "page": p.page, "page_count": c.page_count,
        "finished": bool(p.finished), "at": p.read_at,
    } for p, c, s in rows]
    return {"items": items}
