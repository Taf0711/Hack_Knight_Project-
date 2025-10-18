from sqlmodel import create_engine, Session, SQLModel
from config import DATABASE_URL

engine = create_engine(DATABASE_URL, echo=False)


def get_session():
    with Session(engine) as session:
        yield session


def init_db():
    """Initialize database tables (if not using schema.sql)"""
    SQLModel.metadata.create_all(engine)

