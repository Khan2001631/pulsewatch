# PulseWatch

**PulseWatch** is a full-stack API Monitoring & Incident Management Platform that enables users to continuously monitor websites, APIs, and health-check endpoints. The platform periodically checks registered endpoints, records availability and response times, and automatically creates incidents when services become unavailable.

The project is being built to demonstrate production-style backend engineering concepts using FastAPI, PostgreSQL, React, and modern software architecture practices.

---

## Problem Statement

Modern applications depend on APIs, microservices, databases, and third-party integrations. When one of these services becomes unavailable, teams often discover issues only after users begin reporting failures.

PulseWatch solves this problem by continuously monitoring endpoints and providing visibility into service health, uptime, response times, and incidents.

---

## Key Features

### Authentication & Security

* User Registration
* User Login
* JWT Authentication
* Refresh Token Support
* Protected API Endpoints

### Monitoring

* Create Monitors
* Update Monitors
* Delete Monitors
* Configure Monitoring Intervals
* Website Monitoring
* API Endpoint Monitoring
* Health Check Monitoring

### Incident Management

* Automatic Incident Detection
* Automatic Incident Creation
* Incident Resolution Tracking
* Downtime History

### Analytics & Reporting

* Uptime Percentage
* Response Time Metrics
* Monitoring History
* Incident Statistics
* Service Health Dashboard

---

## Example Workflow

1. User registers an account.
2. User creates a monitor.

Example:

```text
Name: E-Commerce Health API
URL: https://example.com/api/health
Method: GET
Expected Status: 200
Check Interval: 60 seconds
```

3. PulseWatch periodically executes health checks.
4. Results are stored in PostgreSQL.
5. Consecutive failures automatically create incidents.
6. Service recovery automatically resolves incidents.
7. Users can review uptime statistics and incident history from the dashboard.

---

## Technology Stack

### Frontend

* React
* TypeScript
* Tailwind CSS
* ShadCN UI
* React Query
* Axios

### Backend

* FastAPI
* SQLAlchemy
* Alembic
* JWT Authentication
* Pytest

### Database

* PostgreSQL

### Future Enhancements

* Redis
* Celery Workers
* Email Notifications
* Team Workspaces
* Role-Based Access Control (RBAC)
* Webhooks
* Audit Logging

---

## High-Level Architecture

```text
┌─────────────┐
│   React UI  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   FastAPI   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ PostgreSQL  │
└─────────────┘

       ▲
       │
┌─────────────┐
│ Scheduler   │
└──────┬──────┘
       │
       ▼
 Health Checks
       │
       ▼
 Incident Engine
```

---

## Project Structure

```text
pulsewatch/
│
├── frontend/
│
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── clients/
│   │   ├── tasks/
│   │   └── main.py
│   │
│   └── tests/
│
└── README.md
```

---

## Core Backend Concepts Demonstrated

* REST API Design
* Authentication & Authorization
* Database Modeling
* Background Processing
* Health Monitoring
* Incident Management
* Relational Database Design
* Database Migrations
* Dependency Injection
* Logging
* Testing
* Production-Oriented Architecture

---

## Learning Goals

This project was created to:

* Learn FastAPI and the Python ecosystem.
* Gain hands-on experience with PostgreSQL.
* Build a production-style backend system.
* Explore monitoring and incident management concepts.
* Demonstrate language-agnostic software engineering skills.

---

## Status

🚧 Currently under active development.
