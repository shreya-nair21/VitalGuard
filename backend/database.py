import os
from sqlmodel import create_engine, SQLModel, Session

sqlite_file_name = "vitalguard.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# Use DATABASE_URL environment variable if it exists (for production)
# otherwise fallback to local SQLite
DATABASE_URL = os.environ.get("DATABASE_URL", sqlite_url)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Connect args specific to SQLite (not needed for Postgres, etc.)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
