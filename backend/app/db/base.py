"""
Base Database Model Module.

This file exists to define the declarative base class for all database models.
In SQLAlchemy 2.x, all models inherit from this `Base` class, which is created using `DeclarativeBase`.
It registers all subclassed models and provides their shared database metadata, which is essential
for query mapping and database migrations (e.g., via Alembic).
"""

from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """
    Declarative Base class for all SQLAlchemy database models.
    
    By subclassing `DeclarativeBase`, SQLAlchemy automatically associates this base
    class with a `registry` instance and a `MetaData` collection. Every model class
    inheriting from `Base` will register its table structure here.
    """
    pass