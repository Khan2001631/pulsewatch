"""
API Dependencies Module.

This file exists to store reusable FastAPI dependencies.
Dependencies are functions that are executed before route handlers, allowing for
shared functionality, authorization checks, and resource/context management.
In this module, we define the `get_db` dependency to inject database sessions into requests.
"""

from typing import Generator
from sqlalchemy.orm import Session

from app.db.session import SessionLocal

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI database session dependency.
    
    This dependency yields a new database session instance (`SessionLocal`)
    for the duration of a single HTTP request, ensuring:
    1. Isolated transaction contexts per request.
    2. Automatic closing and cleanup of the session via the `finally` block,
       returning the connection back to the SQLAlchemy connection pool.
       
    Yields:
        Session: An active SQLAlchemy Session instance bound to our database engine.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        # The finally block is guaranteed to run after the request completes,
        # ensuring we never leak database connections or keep sessions open.
        db.close()
