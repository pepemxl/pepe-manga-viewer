import os
import time

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import OperationalError

DATABASE_URL = os.getenv(
    "DATABASE_URL", "mysql+pymysql://pepe-manga:pepe-mangapass@mysql:3306/pepe-manga"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=280)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def wait_for_db(max_seconds: int = 60) -> None:
    start = time.time()
    last_err: Exception | None = None
    while time.time() - start < max_seconds:
        try:
            with engine.connect() as conn:
                conn.exec_driver_sql("SELECT 1")
            return
        except OperationalError as e:
            last_err = e
            time.sleep(2)
    raise RuntimeError(f"DB not reachable: {last_err}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
