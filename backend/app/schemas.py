from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    path: str
    enabled: int
    last_scan_at: Optional[datetime] = None


class ChapterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    series_id: int
    number: str
    title: Optional[str] = None
    page_count: int
    format: Optional[str] = None
    progress_page: int = 0
    finished: bool = False
    read_at: Optional[datetime] = None


class SeriesOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    author: Optional[str] = None
    description: Optional[str] = None
    kind: str
    direction: str
    source_path: Optional[str] = None
    format: Optional[str] = None
    tags: Optional[str] = None
    shelf: str
    cover_url: Optional[str] = None
    chapter_count: int = 0
    unread_count: int = 0
    progress_pct: int = 0
    last_read_at: Optional[datetime] = None
    added_at: datetime


class SeriesDetail(SeriesOut):
    chapters: List[ChapterOut] = []
    bookmarks: List["BookmarkOut"] = []


class ProgressIn(BaseModel):
    chapter_id: int
    page: int
    finished: Optional[bool] = None


class BookmarkIn(BaseModel):
    chapter_id: int
    page: int
    note: Optional[str] = None


class BookmarkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    series_id: int
    chapter_id: int
    page: int
    note: Optional[str] = None
    created_at: datetime


class ShelfOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    kind: str
    count: int = 0


class DashboardStats(BaseModel):
    pages_month: int
    chapters_month: int
    streak_days: int
    longest_streak: int
    minutes_month: int
    pages_per_day: List[int]
    by_type: List[dict]
    recent_finishes: List[dict]


class ImportPreviewItem(BaseModel):
    name: str
    path: str
    chapter_count: int
    format: str
    kind: str
    direction: str


class ImportPreview(BaseModel):
    series: List[ImportPreviewItem]


class ImportRequest(BaseModel):
    path: str
    items: Optional[List[ImportPreviewItem]] = None


class SettingsKV(BaseModel):
    key: str
    value: str


SeriesDetail.model_rebuild()
