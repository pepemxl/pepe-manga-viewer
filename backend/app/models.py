from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Numeric, SmallInteger
)
from sqlalchemy.orm import relationship

from .database import Base


class Source(Base):
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True)
    path = Column(String(512), nullable=False, unique=True)
    enabled = Column(SmallInteger, nullable=False, default=1)
    last_scan_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Shelf(Base):
    __tablename__ = "shelves"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    kind = Column(String(40), nullable=False, default="shelf")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Series(Base):
    __tablename__ = "series"
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    author = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    kind = Column(String(40), nullable=False, default="manga")
    direction = Column(String(10), nullable=False, default="LTR")
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=True)
    source_path = Column(String(512), nullable=True)
    cover_url = Column(String(512), nullable=True)
    format = Column(String(20), nullable=True)
    tags = Column(String(255), nullable=True)
    shelf = Column(String(40), nullable=False, default="reading")
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    chapters = relationship(
        "Chapter", back_populates="series",
        cascade="all, delete-orphan", order_by="Chapter.number_sort"
    )


class Chapter(Base):
    __tablename__ = "chapters"
    id = Column(Integer, primary_key=True)
    series_id = Column(Integer, ForeignKey("series.id", ondelete="CASCADE"), nullable=False)
    number = Column(String(20), nullable=False)
    number_sort = Column(Numeric(10, 2), nullable=False, default=0)
    title = Column(String(255), nullable=True)
    page_count = Column(Integer, nullable=False, default=0)
    source_path = Column(String(512), nullable=True)
    format = Column(String(20), nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    series = relationship("Series", back_populates="chapters")


class Progress(Base):
    __tablename__ = "progress"
    id = Column(Integer, primary_key=True)
    series_id = Column(Integer, ForeignKey("series.id", ondelete="CASCADE"), nullable=False)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, unique=True)
    page = Column(Integer, nullable=False, default=1)
    finished = Column(SmallInteger, nullable=False, default=0)
    read_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Bookmark(Base):
    __tablename__ = "bookmarks"
    id = Column(Integer, primary_key=True)
    series_id = Column(Integer, ForeignKey("series.id", ondelete="CASCADE"), nullable=False)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    page = Column(Integer, nullable=False)
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Setting(Base):
    __tablename__ = "settings"
    k = Column(String(64), primary_key=True)
    v = Column(Text, nullable=False)
