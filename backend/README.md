# PulseWatch Backend

A production-ready FastAPI backend framework built with SQLAlchemy 2.x, PostgreSQL, Alembic migrations, Structlog structured logging, and Pytest testing setup.

---

## 🛠️ Tech Stack & Key Libraries

- **Web Framework**: [FastAPI](https://fastapi.tiangolo.com/) (modern, fast, asynchronous ASGI framework)
- **Database Engine & ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (declarative base, connection pool tuning)
- **Database Migrations**: [Alembic](https://alembic.sqlalchemy.org/) (handles schema updates)
- **Structured Logging**: [Structlog](https://www.structlog.org/) (human-readable in development, JSON-serialized in production)
- **Configuration Management**: [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) (typed environment variables loaded from `.env`)
- **Testing**: [Pytest](https://docs.pytest.org/) (custom conftest fixture loading and client configuration)
- **Driver**: `psycopg2-binary` (PostgreSQL adapter)

---

## 📁 Directory Structure

```text
backend/
├── alembic/              # Database migration environment and script revisions
├── app/                  # Application source code
│   ├── api/              # API router and endpoints
│   │   ├── dependencies.py # Shared dependencies (e.g., get_db)
│   │   └── routes/       # API endpoints (versioned/feature-specific)
│   ├── clients/          # External API clients
│   ├── core/             # Core configurations
│   │   ├── config.py     # Pydantic Settings base config
│   │   ├── logging.py    # Structlog configurations (dev & prod handlers)
│   │   └── security.py   # Security utilities (JWT, password hashing)
│   ├── db/               # Database initialization and sessions
│   │   ├── base.py       # DeclarativeBase for models
│   │   └── session.py    # SQLAlchemy engine and sessionmakers
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas (validation/serialization)
│   ├── services/         # Business logic layer
│   ├── tasks/            # Background / worker tasks
│   ├── utils/            # Helper utilities
│   └── main.py           # Application entry point, lifespan, & base routers
├── tests/                # Pytest test suite
│   ├── conftest.py       # Common test fixtures (FastAPI TestClient)
│   └── test_health.py    # Application health endpoints verification
├── .env                  # Local configuration file (git-ignored)
├── .env.example          # Template for environment variables
├── alembic.ini           # Alembic configuration
├── pytest.ini            # Pytest configuration
└── requirements.txt      # Project dependencies
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python**: version 3.13+ recommended
- **PostgreSQL**: Local or remote instance installed and running

### 2. Environment Configuration
Create a `.env` file in the root of the `backend` directory based on the `.env.example` file:
```bash
cp .env.example .env
```

Fill in your configuration settings in `.env`:
```ini
APP_NAME="PulseWatch"
DEBUG=True
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/pulsewatch"
JWT_SECRET="generate-a-secure-random-secret-here"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 3. Local Setup & Installation
1. Initialize the Python virtual environment:
   ```bash
   python -m venv venv
   ```
2. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
3. Install project dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## 💾 Database Migrations (Alembic)

Alembic is configured to read the `DATABASE_URL` dynamically from the Pydantic settings config (`app/core/config.py`).

- **Check current database revision**:
  ```bash
  alembic current
  ```
- **Generate a new migration script**:
  ```bash
  alembic revision --autogenerate -m "description_of_changes"
  ```
- **Apply migrations to head**:
  ```bash
  alembic upgrade head
  ```
- **Downgrade migrations**:
  ```bash
  alembic downgrade -1
  ```

---

## 🏃 Running the Application

Start the local development server with auto-reload:
```bash
uvicorn app.main:app --reload
```
Once started, you can access:
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative Redoc Docs**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Testing

The backend uses Pytest with custom configuration in `pytest.ini` and a custom FastAPI TestClient fixture defined in `tests/conftest.py`.

- **Run all tests**:
  ```bash
  pytest
  ```
- **Run tests in verbose mode**:
  ```bash
  pytest -v
  ```

---

## 📢 Logging Setup

Logging is powered by `structlog` and initializes dynamically in `app/main.py`'s entry point.
- **Development Logging (`DEBUG=True`)**:
  Pretty-printed, colorized terminal console logs.
- **Production Logging (`DEBUG=False`)**:
  JSON-serialized structured logs suitable for centralized logs aggregates (e.g., Datadog, ELK stack).

Example usage in your code:
```python
from app.core.logging import logger

logger.info("User logged in", user_id=123, ip_address="127.0.0.1")
```

---

## 🔌 API Core Endpoints

- **Health Check (`GET /health`)**:
  Verifies that the API server is up and responsive.
- **Database Connectivity Check (`GET /db-check`)**:
  Performs a raw `SELECT 1` database query using the dependency-injected session to verify PostgreSQL connection pooling and health.
