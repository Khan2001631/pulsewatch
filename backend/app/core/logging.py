"""
Structured Logging Configuration Module.

This file exists to configure standard and structured logging across the application.
It integrates with 'structlog' to provide:
1. Standard, readable console logs with colors during local development.
2. High-performance JSON logs in production, designed to be read by log aggregators (e.g., ELK, Datadog).
3. A reusable singleton 'logger' instance importable throughout the codebase.
"""

import logging
import structlog
from structlog.types import Processor

from app.core.config import settings

def setup_logging() -> None:
    """
    Configure structlog processors, filtering, and formatting.
    
    This function initializes structlog globally. It is designed to be called once
    at application startup (in app/main.py).
    """
    
    # 1. Define shared processors: These apply to both development and production logs.
    shared_processors: list[Processor] = [
        # Merges thread-local and contextvars into the log event.
        # This is useful for associating request-scoped keys (e.g., request_id) with log lines.
        structlog.contextvars.merge_contextvars,
        
        # Adds the log level (e.g., "info", "warning", "error") to the event dict under the "level" key.
        structlog.processors.add_log_level,
        
        # Adds a standardized ISO-8601 timestamp under the "timestamp" key (e.g., "2026-06-16T20:23:22.000000Z").
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        
        # If an exception is logged via exc_info=True or logger.exception(), this automatically
        # extracts the traceback and adds it under the "exception" or "traceback" key.
        structlog.processors.format_exc_info,
        
        # Resolves any extra details (such as stack information) if requested.
        structlog.processors.StackInfoRenderer(),
        
        # Enables positional string formatting like logger.info("User %s logged in", username).
        structlog.stdlib.PositionalArgumentsFormatter(),
    ]

    # 2. Determine formatting and output destination based on environmental DEBUG flag.
    if settings.debug:
        # Development configuration:
        # - Prints nicely formatted, colorized log rows.
        # - Renders variables on separate lines for easier local debugging.
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(
                colors=True,
                force_colors=True,  # Force colors even if output is redirected/captured
            )
        ]
        logger_factory = structlog.WriteLoggerFactory()
        log_level = logging.DEBUG
    else:
        # Production configuration:
        # - Prints one-line structured JSON records to stdout.
        # - Uses standard print factory to bypass Python's standard logging bottleneck.
        processors = shared_processors + [
            structlog.processors.JSONRenderer()
        ]
        logger_factory = structlog.PrintLoggerFactory()
        log_level = logging.INFO

    # 3. Apply structural configuration to structlog
    structlog.configure(
        processors=processors,
        # Restricts log output below the specified log level (e.g., ignores DEBUG logs in production)
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=logger_factory,
        cache_logger_on_first_use=True,
    )


# 4. Create and expose a reusable global logger instance.
# Any module in the codebase can do: 'from app.core.logging import logger'
# and then use logger.info(), logger.error(), etc.
logger = structlog.get_logger()
