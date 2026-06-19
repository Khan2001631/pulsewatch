# PulseWatch Backend

A production-ready FastAPI backend for **PulseWatch** — a website and API uptime monitoring service. The backend performs scheduled HTTP health checks against user-configured monitors and stores the results for retrieval via a REST API.

---

## 🛠️ Tech Stack & Key Libraries

| Library | Role |
|---|---|
| [FastAPI](https://fastapi.tiangolo.com/) | ASGI web framework — routing, dependency injection, OpenAPI docs |
| [SQLAlchemy 2.0](https://www.sqlalchemy.org/) | ORM and connection-pool management |
| [Alembic](https://alembic.sqlalchemy.org/) | Schema migration tooling |
| [httpx](https://www.python-httpx.org/) | Async HTTP client used by the health-check executor |
| [Passlib](https://passlib.readthedocs.io/) + bcrypt | Secure password hashing |
| [python-jose](https://python-jose.readthedocs.io/) | JSON Web Token signing and verification |
| [Structlog](https://www.structlog.org/) | Structured logging (colorised dev / JSON production) |
| [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) | Typed environment-variable configuration |
| [Pytest](https://docs.pytest.org/) | Test runner |
| `psycopg2-binary` | PostgreSQL driver |

---

## 📁 Directory Structure

```text
backend/
├── alembic/                    # Alembic migration environment
│   └── versions/               # Auto-generated migration scripts
├── app/
│   ├── api/
│   │   ├── dependencies.py     # Shared FastAPI dependencies (get_db)
│   │   └── routes/
│   │       ├── auth.py         # /api/v1/auth/* endpoints
│   │       ├── monitors.py     # /api/v1/monitors/* endpoints
│   │       └── health_checks.py# /api/v1/monitors/{id}/health-checks, /api/v1/health-checks/{id}
│   ├── core/
│   │   ├── config.py           # Pydantic Settings — typed .env loading
│   │   ├── logging.py          # Structlog setup (dev + prod)
│   │   └── security.py         # JWT creation/verification, password hashing
│   ├── db/
│   │   ├── base.py             # SQLAlchemy DeclarativeBase
│   │   └── session.py          # Engine + SessionLocal factory
│   ├── models/
│   │   ├── user.py             # User ORM model
│   │   ├── user_session.py     # UserSession ORM model (refresh token tracking)
│   │   ├── monitor.py          # Monitor ORM model
│   │   └── health_check.py     # HealthCheck ORM model (NEW — Phase 2)
│   ├── schemas/
│   │   ├── auth.py             # Auth request/response schemas
│   │   ├── user.py             # User response schema
│   │   ├── monitor.py          # Monitor CRUD schemas
│   │   └── health_check.py     # HealthCheckResponse schema (NEW — Phase 2)
│   ├── services/
│   │   ├── auth_service.py     # Auth business logic + get_current_user dependency
│   │   ├── monitor_service.py  # Monitor CRUD business logic
│   │   └── health_check_service.py # HTTP execution + DB query logic (NEW — Phase 2)
│   ├── tasks/
│   │   └── monitor_scheduler.py # asyncio background scheduler (NEW — Phase 2)
│   ├── clients/                # External API clients (reserved)
│   ├── utils/                  # Shared helper utilities (reserved)
│   └── main.py                 # App entry point, lifespan, CORS, router registration
├── tests/
│   ├── conftest.py             # Pytest fixtures (FastAPI TestClient)
│   └── test_health.py          # Health endpoint smoke tests
├── .env                        # Local configuration (git-ignored)
├── .env.example                # Configuration template
├── alembic.ini                 # Alembic configuration
├── pytest.ini                  # Pytest configuration
└── requirements.txt            # Pinned dependencies
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python** 3.13+
- **PostgreSQL** running locally or remotely

### 2. Environment Configuration

Copy the example file and fill in your values:
```bash
cp .env.example .env
```

```ini
APP_NAME="PulseWatch"
DEBUG=True
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/pulsewatch"
JWT_SECRET="generate-a-secure-random-secret-here"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 3. Local Setup

```bash
# Create and activate virtual environment
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Apply Database Migrations

```bash
alembic upgrade head
```

### 5. Start the Development Server

```bash
uvicorn app.main:app --reload
```

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Redoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 💾 Database Migrations (Alembic)

Alembic reads `DATABASE_URL` from `app/core/config.py` automatically.

```bash
# Check current revision
alembic current

# Generate a new migration from model changes
alembic revision --autogenerate -m "description_of_changes"

# Apply all pending migrations
alembic upgrade head

# Roll back the last migration
alembic downgrade -1
```

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Verbose output
pytest -v
```

---

## 📢 Logging

Structured logging via `structlog`. Initialised once at startup in `main.py`.

| Environment | Output |
|---|---|
| `DEBUG=True` | Colourised, human-readable console output |
| `DEBUG=False` | Single-line JSON records (suitable for Datadog, ELK, etc.) |

```python
from app.core.logging import logger

logger.info("Health check executed", monitor_id=42, status="SUCCESS", response_time_ms=120)
```

---

## 🔌 System Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Confirms the API server is running |
| `GET` | `/db-check` | Runs `SELECT 1` to confirm DB connectivity |

---

## 🔒 Authentication System

PulseWatch uses a **Tier 3 stateful authentication architecture** with HttpOnly cookies and refresh-token rotation.

### Security Features

1. **HttpOnly Cookies** — Tokens are never exposed to JavaScript, eliminating XSS token theft.
2. **Refresh Token Rotation (RTR)** — Every `/refresh` call issues a brand-new token pair and invalidates the old one.
3. **Replay & Hijack Protection** — Submitting an already-rotated token revokes *all* sessions in that family, forcing a full logout.
4. **Stateful Sessions** — Each login creates a row in `user_sessions` for real-time auditing and remote revocation.

### Authentication Endpoints

All endpoints are prefixed `/api/v1`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new account |
| `POST` | `/auth/login` | Log in; sets `access_token` + `refresh_token` cookies |
| `POST` | `/auth/refresh` | Rotate token pair silently |
| `GET` | `/auth/me` | Return the current user's profile |
| `POST` | `/auth/logout` | Revoke session and clear cookies |

**Register / Login request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Password rules:** 8–128 characters, at least one uppercase letter, one lowercase letter, and one number.

---

## 📡 Monitor Endpoints

Monitors define what to check, how often, and what a healthy response looks like.

All endpoints are prefixed `/api/v1` and require an authenticated session cookie.

| Method | Path | Description |
|---|---|---|
| `POST` | `/monitors` | Create a new monitor |
| `GET` | `/monitors` | List all monitors owned by the current user |
| `GET` | `/monitors/{id}` | Get a single monitor |
| `PUT` | `/monitors/{id}` | Update a monitor (partial updates supported) |
| `DELETE` | `/monitors/{id}` | Delete a monitor permanently |

**Create / Update fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | required | Human-readable label (max 100 chars) |
| `url` | URL | required | Full HTTP/HTTPS URL to monitor |
| `method` | enum | `GET` | HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) |
| `expected_status_code` | int | `200` | Status code that indicates a healthy response (100–599) |
| `check_interval_seconds` | int | `60` | How often to check, in seconds (must be > 0) |
| `is_active` | bool | `true` | Set to `false` to pause without deleting |

---

## 🩺 Health Check Engine (Phase 2)

### How It Works

On application startup, a background `asyncio` task (`monitor_scheduler.py`) wakes every **10 seconds** and evaluates all active monitors. If a monitor's `check_interval_seconds` has elapsed since its last check, a new health check task is spawned concurrently.

Each check:
1. Sends the configured HTTP request with a **10-second timeout**.
2. Measures round-trip response time in milliseconds.
3. Compares the returned status code against `expected_status_code`.
4. Writes a `HealthCheck` record to the database with status `SUCCESS` or `FAILURE`.

| Scenario | Status | status_code | response_time_ms | error_message |
|---|---|---|---|---|
| Response matches expected code | `SUCCESS` | actual code | measured | `null` |
| Response does not match expected code | `FAILURE` | actual code | measured | `null` |
| Request times out (> 10s) | `FAILURE` | `null` | measured up to cutoff | `"Request timed out after 10s"` |
| DNS / connection error | `FAILURE` | `null` | `null` | exception message |

### Scheduler Behaviour

- Runs entirely inside the FastAPI process — no Redis, Celery, or extra infrastructure needed.
- Tracks `last_checked_at` in an in-memory dictionary per monitor. On restart, all monitors are treated as immediately due.
- Concurrent checks are isolated: a slow monitor never blocks a fast one.
- On application shutdown, the scheduler task is cancelled gracefully.

### Health Check Endpoints

All endpoints require an authenticated session cookie. Ownership is always enforced — users can only see health checks for their own monitors.

| Method | Path | Description |
|---|---|---|
| `GET` | `/monitors/{id}/health-checks` | Latest 50 health checks for a monitor (newest first) |
| `GET` | `/health-checks/{id}` | Retrieve a single health check record by ID |

**`HealthCheckResponse` fields:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | int | no | Unique record identifier |
| `monitor_id` | int | no | Parent monitor ID |
| `status` | `SUCCESS` \| `FAILURE` | no | Outcome of the check |
| `status_code` | int | yes | HTTP status code from the server |
| `response_time_ms` | int | yes | Round-trip time in milliseconds |
| `error_message` | string | yes | Failure reason for non-HTTP errors |
| `checked_at` | datetime (UTC) | no | When the check was executed |

---

## 🗺️ Architecture Overview

```text
HTTP Request
    │
    ▼
FastAPI Route          (app/api/routes/)
    │   validates input, resolves auth dependency
    ▼
Service Layer          (app/services/)
    │   owns all business logic and ownership enforcement
    ▼
SQLAlchemy ORM         (app/models/)
    │   maps Python objects ↔ PostgreSQL rows
    ▼
PostgreSQL Database

────────────────────────────────────────────────

Background Scheduler   (app/tasks/monitor_scheduler.py)
    │   asyncio loop — wakes every 10 s
    ▼
Health Check Service   (app/services/health_check_service.py)
    │   httpx async request, 10s timeout
    ▼
HealthCheck Model      (app/models/health_check.py)
    │   persists result
    ▼
PostgreSQL Database
```
