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
| [Resend SDK](https://resend.com/) | Email dispatch client for password recovery & system notifications |

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
│   │   ├── monitors.py     # /api/v1/monitors/* endpoints
│   │       ├── health_checks.py# /api/v1/monitors/{id}/health-checks, /api/v1/health-checks/{id}
│   │       ├── incidents.py    # /api/v1/incidents/* endpoints (NEW — Phase 3)
│   │       └── dashboard.py    # /api/v1/dashboard/* endpoints (NEW — Phase 4)
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
│   │   ├── health_check.py     # HealthCheck ORM model (NEW — Phase 2)
│   │   ├── incident.py         # Incident ORM model (NEW — Phase 3)
│   │   └── password_reset_token.py # PasswordResetToken ORM model (hashed reset tokens)
│   ├── schemas/
│   │   ├── auth.py             # Auth request/response schemas
│   │   ├── user.py             # User response schema
│   │   ├── monitor.py          # Monitor CRUD schemas
│   │   ├── health_check.py     # HealthCheckResponse schema (NEW — Phase 2)
│   │   ├── incident.py         # IncidentResponse schema (NEW — Phase 3)
│   │   └── dashboard.py        # Dashboard metrics response schemas (NEW — Phase 4)
│   ├── services/
│   │   ├── auth_service.py     # Auth business logic + get_current_user dependency
│   │   ├── monitor_service.py  # Monitor CRUD business logic
│   │   ├── email_service.py    # Centralized Resend integration for sending emails
│   │   ├── health_check_service.py # HTTP execution + DB query logic (NEW — Phase 2)
│   │   ├── incident_service.py # Incident lifecycle management (NEW — Phase 3)
│   │   └── dashboard_service.py # Analytics calculation logic (NEW — Phase 4)
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
RESEND_API_KEY="re_your_api_key_here"
FRONTEND_URL="http://localhost:5173"
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
5. **Secure Password Recovery** — Forgotten passwords can be reset via email using single-use, cryptographically secure, time-bound (1-hour) tokens.
6. **Compromise Mitigation** — Resetting a password immediately revokes all existing active user sessions, forcing all client applications to log back in.

### Authentication Endpoints

All endpoints are prefixed `/api/v1`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new account |
| `POST` | `/auth/login` | Log in; sets `access_token` + `refresh_token` cookies |
| `POST` | `/auth/refresh` | Rotate token pair silently |
| `GET` | `/auth/me` | Return the current user's profile |
| `POST` | `/auth/logout` | Revoke session and clear cookies |
| `POST` | `/auth/forgot-password` | Generate reset token and email password reset link |
| `POST` | `/auth/reset-password` | Reset password using token, revoking all active user sessions |

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

## 🚨 Incident Management (Phase 3)

### How It Works

PulseWatch automatically detects service outages and transitions them into tracked incidents. The incident lifecycle is governed by the following rules:

1. **Incident Creation**:
   - An incident is automatically created (`OPEN`) when a monitor registers **3 consecutive failures** (`CheckStatus.FAILURE`).
   - The incident's `started_at` is set to the timestamp of the third (threshold-breaching) failure.
   - The default creation reason is `"3 consecutive failed health checks"`.
   - **Only one `OPEN` incident** can exist per monitor at any time. Additional consecutive failures are ignored and do not create new incidents.

2. **Incident Resolution**:
   - An `OPEN` incident is resolved when the monitor recovers and registers **3 consecutive successes** (`CheckStatus.SUCCESS`).
   - The incident's `resolved_at` is set to the timestamp of the third consecutive success, and its status is updated to `RESOLVED`.
   - Once resolved, a future outage can trigger a new incident.

3. **Duration Calculation**:
   - The incident duration in seconds (`duration_seconds`) is computed dynamically:
     - For `RESOLVED` incidents: `resolved_at - started_at`
     - For `OPEN` incidents: `now (UTC) - started_at`

### Incident Endpoints

All endpoints require an authenticated session cookie and enforce strict monitor ownership.

| Method | Path | Description |
|---|---|---|
| `GET` | `/incidents` | List all incidents for all monitors owned by the current user (newest first) |
| `GET` | `/incidents/{id}` | Get a specific incident by ID (ownership-verified) |
| `GET` | `/monitors/{id}/incidents` | List all incidents for a specific monitor (ownership-verified) |

**`IncidentResponse` fields:**

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | int | no | Unique incident ID |
| `monitor_id` | int | no | Parent monitor ID |
| `status` | `OPEN` \| `RESOLVED` | no | Current status of the incident |
| `reason` | string | no | Reason for opening the incident |
| `started_at` | datetime (UTC) | no | When the incident started (timestamp of the 3rd failure) |
| `resolved_at` | datetime (UTC) | yes | When the incident was resolved (timestamp of the 3rd success) |
| `duration_seconds` | int | no | Computed duration of the incident |
| `created_at` | datetime (UTC) | no | Database creation timestamp |
| `updated_at` | datetime (UTC) | no | Database update timestamp |

---

## 📊 Dashboard & Analytics (Phase 4)

Provides global, aggregated views over a user's monitors, health checks, and incidents to display the system's operational status at a glance.

### Analytics Calculation Logic

1. **Monitors Status Summary**:
   - `total_monitors`: All monitors owned by the user.
   - `down_monitors`: Count of monitors currently holding an `OPEN` incident.
   - `healthy_monitors`: Count of `is_active` monitors holding no `OPEN` incident.
2. **Uptime Percentage**:
   - Evaluates the total number of successful checks out of the total checks over a rolling window (24 hours and 7 days).
   - Computed both across the entire user account (all monitors combined) and for each individual monitor.
3. **Response Times**:
   - Averages the successful network round-trip times per monitor over a rolling 24-hour window.
   - Selects the latest response time for each monitor.

### Dashboard Endpoints

All endpoints require an authenticated session cookie.

| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard/summary` | General totals (total/healthy/down monitors, open/resolved incidents) |
| `GET` | `/dashboard/uptime` | Rolling 24-hour and 7-day uptime percentages |
| `GET` | `/dashboard/response-times` | Average and latest response times per monitor (24h window) |
| `GET` | `/dashboard/recent-incidents` | Latest 10 incidents across all of a user's monitors |

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
Incident Service       (app/services/incident_service.py)
    │   evaluates consecutive results window
    ▼
Incident Model         (app/models/incident.py)
    │   creates/resolves incident
    ▼
PostgreSQL Database
```
