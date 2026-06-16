from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.api.dependencies import get_db
from app.core.logging import setup_logging, logger

# Initialize structured logging configurations as early as possible.
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan event handler.
    Manages application startup and shutdown hooks, ensuring log hooks are captured.
    """
    # Log application startup details in structured format
    logger.info(
        "Application startup initiated",
        app_name=settings.app_name,
        debug_mode=settings.debug,
    )
    try:
        yield
    finally:
        # Log application shutdown details
        logger.info("Application shutdown completed")


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)


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
