"""Filesystem scanner — turns folders / archives into Series + Chapters."""
from __future__ import annotations

import io
import os
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

from sqlalchemy.orm import Session

from . import models

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
ARCHIVE_EXTS = {".cbz", ".zip"}
DOC_EXTS = {".pdf", ".epub"}

CHAPTER_NUM_RE = re.compile(r"(?:ch(?:apter)?[\s._-]*)?(\d+(?:\.\d+)?)", re.IGNORECASE)

# Prioritized patterns for "this is the chapter number" — tried in order, first hit wins.
# Each pattern captures the chapter number in group(1).
_NUM = r"(\d{1,4}(?:\.\d{1,3})?)"
_CHAPTER_PATTERNS = [
    # explicit chapter markers (highest confidence)
    re.compile(rf"\bch(?:apter|apt|p)?[\s._\-#]*{_NUM}\b", re.IGNORECASE),
    re.compile(rf"\bc[\s._\-#]?{_NUM}\b",                  re.IGNORECASE),
    re.compile(rf"\bep(?:isode)?[\s._\-#]*{_NUM}\b",       re.IGNORECASE),
    re.compile(rf"\bep?[\s._\-#]?{_NUM}\b",                re.IGNORECASE),
    # volume+chapter combos like v01c05 / v1_ch5 — take the chapter part
    re.compile(rf"\bv\d+[\s._\-]*(?:c|ch|chapter)[\s._\-]*{_NUM}\b", re.IGNORECASE),
    # "#5" / "# 5"
    re.compile(rf"#\s*{_NUM}\b"),
    # CJK markers — 第N話 / N話 / N화
    re.compile(rf"(?:第)?{_NUM}\s*(?:話|话|화|回)"),
]
# strip these tokens before the "last standalone number" fallback, so they
# don't shadow the real chapter number (e.g. "[Group17] Series 2020 - 05.cbz")
_NOISE_PATTERNS = [
    re.compile(r"\[[^\]]*\]"),                          # [Scanlator]
    re.compile(r"\([^\)]*\)"),                          # (v01) / (1080p)
    re.compile(r"\b(19|20)\d{2}\b"),                    # years
    re.compile(r"\bv(?:ol(?:ume)?)?[\s._\-#]*\d+\b", re.IGNORECASE),  # volume tags
    re.compile(r"\b(?:1080p|720p|480p|2160p|hd|hq|sd)\b", re.IGNORECASE),
]
_TRAILING_TOKENS = re.compile(r"\b\d{1,4}(?:\.\d{1,3})?\b")


def parse_chapter_number(name: str) -> tuple[float | None, str | None]:
    """Detect a chapter number in `name` (filename or folder name).

    Returns ``(number, title)`` where ``number`` is a float for sorting and
    ``title`` is the leftover descriptive portion (or None).
    """
    base = Path(name).stem
    # try the explicit, high-confidence patterns first
    for pat in _CHAPTER_PATTERNS:
        m = pat.search(base)
        if m:
            try:
                num = float(m.group(1))
                title = (base[:m.start()] + " " + base[m.end():]).strip(" _-.")
                title = re.sub(r"[\s_\-]+", " ", title).strip(" -·.")
                return num, (title or None)
            except ValueError:
                continue

    # fallback: strip noise (scanlator tags, volume, years) and take the LAST
    # remaining standalone number — that's almost always the chapter number.
    scrubbed = base
    for pat in _NOISE_PATTERNS:
        scrubbed = pat.sub(" ", scrubbed)
    nums = list(_TRAILING_TOKENS.finditer(scrubbed))
    if nums:
        m = nums[-1]
        try:
            num = float(m.group(0))
            title = (scrubbed[:m.start()] + " " + scrubbed[m.end():]).strip(" _-.")
            title = re.sub(r"[\s_\-]+", " ", title).strip(" -·.")
            return num, (title or None)
        except ValueError:
            pass

    return None, None


@dataclass
class ChapterInfo:
    number: str
    number_sort: float
    title: str | None
    page_count: int
    source_path: str
    format: str


@dataclass
class SeriesInfo:
    name: str
    source_path: str
    format: str
    chapters: list[ChapterInfo]


def _natural_key(name: str) -> tuple[int, float, str]:
    """Sort chapter folders/files numerically when possible."""
    num, _ = parse_chapter_number(name)
    if num is not None:
        return (0, num, name.lower())
    return (1, 0.0, name.lower())


def _count_images_in_archive(path: Path) -> int:
    try:
        with zipfile.ZipFile(path) as zf:
            return sum(
                1 for n in zf.namelist()
                if Path(n).suffix.lower() in IMAGE_EXTS and not n.endswith("/")
            )
    except Exception:
        return 0


def _count_images_in_folder(folder: Path) -> int:
    return sum(
        1 for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )


def _format_label(num: float) -> str:
    # render whole numbers as "Ch. 5", decimals as "Ch. 5.5"
    return f"Ch. {num:g}"


def _chapter_label_from_name(name: str, idx: int) -> tuple[str, float, str | None]:
    base = Path(name).stem
    num, title = parse_chapter_number(base)
    if num is not None:
        return (_format_label(num), num, title)
    fallback = base.replace("_", " ").replace("-", " ").strip() or None
    return (_format_label(float(idx + 1)), float(idx + 1), fallback)


def discover(root: Path) -> list[SeriesInfo]:
    """Walk `root` one level deep — each child becomes a series."""
    if not root.exists() or not root.is_dir():
        return []
    out: list[SeriesInfo] = []
    for entry in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if entry.name.startswith("."):
            continue
        info = _series_from_entry(entry)
        if info and info.chapters:
            out.append(info)
    return out


def _series_from_entry(entry: Path) -> SeriesInfo | None:
    if entry.is_file():
        if entry.suffix.lower() in ARCHIVE_EXTS:
            pages = _count_images_in_archive(entry)
            ch = ChapterInfo(
                number="Ch. 1", number_sort=1.0, title=entry.stem,
                page_count=pages, source_path=str(entry), format="cbz",
            )
            return SeriesInfo(entry.stem, str(entry), "cbz", [ch])
        return None

    chapters: list[ChapterInfo] = []
    items = sorted(entry.iterdir(), key=lambda p: _natural_key(p.name))

    archive_children = [p for p in items if p.is_file() and p.suffix.lower() in ARCHIVE_EXTS]
    image_children = [p for p in items if p.is_file() and p.suffix.lower() in IMAGE_EXTS]
    folder_children = [p for p in items if p.is_dir()]

    if archive_children:
        for i, arc in enumerate(archive_children):
            label, sort, title = _chapter_label_from_name(arc.name, i)
            chapters.append(ChapterInfo(
                number=label, number_sort=sort, title=title,
                page_count=_count_images_in_archive(arc),
                source_path=str(arc), format="cbz",
            ))
        fmt = "cbz"
    elif folder_children:
        for i, sub in enumerate(folder_children):
            label, sort, title = _chapter_label_from_name(sub.name, i)
            chapters.append(ChapterInfo(
                number=label, number_sort=sort, title=title,
                page_count=_count_images_in_folder(sub),
                source_path=str(sub), format="folder",
            ))
        fmt = "folder"
    elif image_children:
        chapters.append(ChapterInfo(
            number="Ch. 1", number_sort=1.0, title=entry.name,
            page_count=len(image_children),
            source_path=str(entry), format="folder",
        ))
        fmt = "folder"
    else:
        return None

    return SeriesInfo(entry.name, str(entry), fmt, chapters)


def preview(root_path: str) -> list[dict]:
    root = Path(root_path)
    items = discover(root)
    return [{
        "name": s.name, "path": s.source_path,
        "chapter_count": len(s.chapters),
        "format": s.format, "kind": "manga", "direction": "LTR",
    } for s in items]


def commit(db: Session, root_path: str, items_filter: Iterable[str] | None = None) -> dict:
    """Walk `root_path` and upsert any series + chapters found."""
    root = Path(root_path)
    items = discover(root)

    src = db.query(models.Source).filter_by(path=root_path).first()
    if not src:
        src = models.Source(path=root_path, enabled=1, last_scan_at=datetime.utcnow())
        db.add(src)
        db.flush()
    else:
        src.last_scan_at = datetime.utcnow()

    allowed = set(items_filter) if items_filter else None
    added_series = 0
    added_chapters = 0

    for info in items:
        if allowed and info.source_path not in allowed:
            continue
        series = db.query(models.Series).filter_by(source_path=info.source_path).first()
        if not series:
            series = models.Series(
                title=info.name,
                kind="manga", direction="LTR",
                source_id=src.id, source_path=info.source_path,
                format=info.format, shelf="reading",
            )
            db.add(series)
            db.flush()
            added_series += 1

        existing = {(c.number, c.source_path) for c in series.chapters}
        for ch in info.chapters:
            key = (ch.number, ch.source_path)
            if key in existing:
                continue
            db.add(models.Chapter(
                series_id=series.id,
                number=ch.number, number_sort=ch.number_sort,
                title=ch.title, page_count=ch.page_count,
                source_path=ch.source_path, format=ch.format,
            ))
            added_chapters += 1

    db.commit()
    return {"series": added_series, "chapters": added_chapters}


def redetect_series_chapter_numbers(db: Session, series_id: int) -> dict:
    """Re-run the chapter-number detector against each chapter's stored
    source_path. Updates ``number`` / ``number_sort`` / ``title`` when the new
    parse yields a number; leaves the row untouched otherwise. Useful after
    the detector has been improved without rescanning the filesystem."""
    chapters = db.query(models.Chapter).filter_by(series_id=series_id).all()
    if not chapters:
        return {"checked": 0, "updated": 0}

    updated = 0
    for c in chapters:
        ref = c.source_path or c.number or ""
        # use the filename component, not the full path
        name = Path(ref).name if ref else ""
        num, title = parse_chapter_number(name)
        if num is None:
            continue
        new_number = _format_label(num)
        if (c.number != new_number) or (float(c.number_sort or 0) != num):
            c.number = new_number
            c.number_sort = num
            if title and not c.title:
                c.title = title
            updated += 1
    if updated:
        db.commit()
    return {"checked": len(chapters), "updated": updated}


# ── page reading ────────────────────────────────────────────────────────────

def list_pages(chapter: models.Chapter) -> list[str]:
    """Return a list of *page tokens* — opaque strings the reader can resolve."""
    path = Path(chapter.source_path or "")
    if not path.exists():
        return []
    if chapter.format == "cbz" and path.is_file():
        with zipfile.ZipFile(path) as zf:
            names = [n for n in zf.namelist()
                     if Path(n).suffix.lower() in IMAGE_EXTS and not n.endswith("/")]
            names.sort(key=lambda n: _natural_key(Path(n).name))
            return names
    if path.is_dir():
        names = sorted(
            (p.name for p in path.iterdir()
             if p.is_file() and p.suffix.lower() in IMAGE_EXTS),
            key=_natural_key,
        )
        return names
    return []


def read_page_bytes(chapter: models.Chapter, page_index: int) -> tuple[bytes, str] | None:
    pages = list_pages(chapter)
    if not pages or not (0 <= page_index < len(pages)):
        return None
    token = pages[page_index]
    path = Path(chapter.source_path or "")
    mime_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp",
        ".gif": "image/gif", ".bmp": "image/bmp",
    }
    suffix = Path(token).suffix.lower()
    mime = mime_map.get(suffix, "application/octet-stream")
    if chapter.format == "cbz" and path.is_file():
        with zipfile.ZipFile(path) as zf:
            return zf.read(token), mime
    if path.is_dir():
        return (path / token).read_bytes(), mime
    return None
