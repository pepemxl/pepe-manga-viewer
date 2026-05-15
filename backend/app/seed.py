"""Sample-data seeder. Builds tiny CBZ archives under MANGA_ROOT so the UI
has something to show on first boot."""
from __future__ import annotations

import io
import os
import struct
import zipfile
import zlib
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from . import models, scanner

SAMPLES = [
    ("Hollow Engine",     "Asai Renji",   "manga",   "RTL", "seinen,mecha,melancholy,ongoing", 8),
    ("Crows of Hokuto",   "—",            "manga",   "RTL", "seinen,action",                  6),
    ("Solo Climb",        "—",            "manhwa",  "vert","action,fantasy,webtoon",         5),
    ("Iron Veil",         "—",            "comic",   "LTR", "sci-fi,comic",                   4),
    ("Quiet Sunday",      "—",            "book",    "LTR", "slice-of-life",                  3),
    ("Tower of Ink",      "—",            "manhwa",  "vert","fantasy,webtoon",                4),
]


def _make_png(w: int, h: int, label: str) -> bytes:
    """Tiny synthetic PNG with a label baked into the filename, not pixels.
    We just need *bytes that decode as PNG* so browsers render them."""
    # 1-byte-per-pixel grayscale, alternating bands so pages look distinct.
    rows = []
    band = (hash(label) % 64) + 32
    for y in range(h):
        gray = 200 if (y // 8) % 2 == 0 else band
        rows.append(b"\x00" + bytes([gray]) * w)
    raw = b"".join(rows)
    compressed = zlib.compress(raw, 9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0)  # 8-bit grayscale
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")


def _build_cbz(target: Path, page_count: int, label: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        return
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zf:
        for i in range(1, page_count + 1):
            name = f"{i:03d}.png"
            zf.writestr(name, _make_png(220, 320, f"{label}-{i}"))


def seed(db: Session, manga_root: str) -> None:
    root = Path(manga_root)
    root.mkdir(parents=True, exist_ok=True)

    for title, author, kind, direction, tags, ch_count in SAMPLES:
        series_dir = root / title.replace(" ", "_")
        series_dir.mkdir(exist_ok=True)
        for ci in range(1, ch_count + 1):
            pg = 8 + ((ci * 3) % 6)
            _build_cbz(series_dir / f"ch{ci:02d}.cbz", pg, f"{title}-{ci}")

    # Now run the scanner to upsert
    result = scanner.commit(db, str(root))

    # Patch metadata (kind, direction, tags, author) for newly-seeded series
    for title, author, kind, direction, tags, _ in SAMPLES:
        series_dir = str(root / title.replace(" ", "_"))
        s = db.query(models.Series).filter_by(source_path=series_dir).first()
        if not s:
            continue
        s.title = title
        s.author = author if author != "—" else None
        s.kind = kind
        s.direction = direction
        s.tags = tags
        s.description = (
            "Auto-seeded sample. Synthetic pages — replace this folder with a "
            "real CBZ/CBR or image folder to see your own content."
        )
    db.commit()
    return result
