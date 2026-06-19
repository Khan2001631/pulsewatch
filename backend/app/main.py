import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.api.dependencies import get_db
from app.core.logging import setup_logging, logger
from app.api.routes.auth import router as auth_router
from app.api.routes.monitors import router as monitors_router
from app.api.routes.health_checks import router as health_checks_router
from app.tasks.monitor_scheduler import run_scheduler

# Initialize structured logging configurations as early as possible.
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan event handler.
    Manages application startup and shutdown hooks, ensuring log hooks are captured.
    Starts the monitor scheduler as a background asyncio task on startup and
    cancels it gracefully on shutdown.
    """
    # Log application startup details in structured format
    logger.info(
        "Application startup initiated",
        app_name=settings.app_name,
        debug_mode=settings.debug,
    )

    # Start the background health-check scheduler.
    scheduler_task = asyncio.create_task(run_scheduler(), name="monitor_scheduler")
    logger.info("Monitor scheduler task created")

    try:
        yield
    finally:
        # Cancel the scheduler and wait for it to finish cleanly.
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass  # Expected — scheduler exits its loop on CancelledError.
        logger.info("Application shutdown completed")


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
# `allow_credentials=True` is required for the browser to send and receive
# HttpOnly cookies on cross-origin requests (e.g., React on :3000 → API on :8000).
# In production, replace the wildcard origin with your specific frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React / Vite dev servers
    allow_credentials=True,  # Must be True for cookie-based auth
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router, prefix="/api/v1")
app.include_router(monitors_router, prefix="/api/v1")
app.include_router(health_checks_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    """
    Standard application health check endpoint.
    Verifies that the web server is running.
    """
    # Log checking execution path
    logger.info("Executing health check request")
    return {
        "status": "healthy",
        "app": settings.app_name,
    }


@app.get("/db-check")
def db_check(db: Session = Depends(get_db)):
    """
    Temporary database connectivity verification endpoint.
    
    Executes a simple "SELECT 1" query against PostgreSQL using the 
    request's database session dependency.
    """
    logger.info("Executing database connectivity check")
    try:
        # Executes the simple SELECT 1 query to verify the engine, pool, and DB connection.
        result = db.execute(text("SELECT 1")).scalar()
        
        if result == 1:
            logger.info("Database connectivity check succeeded")
            return {
                "status": "connected",
                "message": "Database connection verified successfully.",
                "database_url_configured": True
            }
        else:
            logger.error("Database check returned unexpected result", result=result)
            raise HTTPException(
                status_code=500,
                detail="Database returned an unexpected result from check query."
            )
            
    except Exception as e:
        # Log exception with structured details (exc_info=True captures traceback automatically)
        logger.exception("Database connectivity check failed", error_message=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Database connection check failed: {str(e)}"
        )
