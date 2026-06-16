"""
Database Session Management Module.

This file exists to configure the database connection engine and session factory.
It initializes the SQLAlchemy engine with settings fetched from the application config
and sets up `SessionLocal`, which is used to instantiate session instances for each HTTP request.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# 1. Create the SQLAlchemy database engine
# We use standard synchronous connection options.
# - pool_pre_ping=True: Enables a "pre-ping" check before executing queries on a connection. 
#   If the connection has been closed or dropped by PostgreSQL, it is discarded and replaced transparently.
# - pool_size=10: The number of persistent database connections to maintain in the pool.
# - max_overflow=20: The maximum number of temporary connections to open above pool_size 
#   during traffic surges.
# - pool_recycle=1800: Closes and replaces connections older than 1800 seconds (30 minutes) 
#   to prevent idle timeouts from database-side policies.
# - pool_timeout=30: Number of seconds to wait before giving up on getting a connection from the pool.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_timeout=30,
)

# 2. Create the SessionLocal session class
# This factory will be called to construct a new Session context for each HTTP request.
# - autocommit=False: Disables automatic commit. Transactions must be committed or rolled back explicitly.
# - autoflush=False: Disables automatic flush. Prevents database state synchronization before queries are fully ready.
# - bind=engine: Binds the session instances to the connection pool and engine we configured above.
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)