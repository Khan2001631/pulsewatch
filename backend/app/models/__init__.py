"""
Models Package.

Explicitly import all ORM models here so that:
  1. SQLAlchemy's DeclarativeBase (`Base`) collects their table metadata.
  2. Alembic's `env.py` — which imports `Base` from `app.db.base` — sees all
     tables and can autogenerate accurate migration scripts.

If you add a new model, add its import to this file.
"""

from app.models.user import User  # noqa: F401
from app.models.user_session import UserSession, SessionStatus  # noqa: F401
from app.models.monitor import Monitor, HTTPMethod  # noqa: F401
from app.models.health_check import HealthCheck, CheckStatus  # noqa: F401
from app.models.incident import Incident, IncidentStatus  # noqa: F401
from app.models.password_reset_token import PasswordResetToken  # noqa: F401
