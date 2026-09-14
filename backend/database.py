import os
from sqlmodel import create_engine, SQLModel, Session

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
default_sqlite_path = os.path.join(BASE_DIR, "vitalguard.db")
sqlite_url = f"sqlite:///{default_sqlite_path.replace(os.sep, '/')}"

# Use DATABASE_URL environment variable if it exists (for production)
# otherwise fallback to local SQLite
DATABASE_URL = os.environ.get("DATABASE_URL", sqlite_url)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Connect args specific to SQLite (not needed for Postgres, etc.)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

def create_db_and_tables():
    from sqlalchemy import text
    SQLModel.metadata.create_all(engine)
    # Ensure SQLite columns exist if user table was created prior to schema update
    try:
        with engine.connect() as conn:
            user_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(user)")).fetchall()]
            if "specialty" not in user_cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN specialty VARCHAR DEFAULT 'General Medicine'"))
            if "availability" not in user_cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN availability VARCHAR DEFAULT 'available'"))
            if "full_name" not in user_cols:
                conn.execute(text("ALTER TABLE user ADD COLUMN full_name VARCHAR"))

            assign_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(doctorassignment)")).fetchall()]
            if "attempted_doctor_ids" not in assign_cols:
                conn.execute(text("ALTER TABLE doctorassignment ADD COLUMN attempted_doctor_ids VARCHAR DEFAULT ''"))
            if "escalation_level" not in assign_cols:
                conn.execute(text("ALTER TABLE doctorassignment ADD COLUMN escalation_level INTEGER DEFAULT 0"))

            conn.commit()
    except Exception as e:
        print(f"Schema migration note: {e}")

def get_session():
    with Session(engine) as session:
        yield session
