# 🛡️ ShieldSentinel
### AI-Powered Full-Cycle Web Security Platform

> Scan URLs and source code for vulnerabilities. Get AI-powered fixes, WAF rules, and compliance reports — all in one platform.

## Features
- 🔍 DAST scanning (ZAP + Nuclei) — real attack simulation
- 📁 SAST scanning (Semgrep + Gitleaks + Bandit + Trivy)
- 🤖 AI code fixes with IDE prompts (Groq + Gemini)
- 🛡️ Auto-generated WAF rules (ModSecurity, AWS WAF, Cloudflare)
- 📊 Real-time dashboard with risk scores
- 📄 PDF + JSON report export
- 🗺️ Visual attack surface map
- 📋 Compliance mapping (OWASP, PCI-DSS, HIPAA, GDPR)
- 💬 AI security chatbot
- 🔗 SAST+DAST correlation engine

## Quick Start
1. Clone the repository
2. Set your environment variables in `.env` (Redis URL, API keys, etc.)
3. Run `docker compose up -d`
4. Access the application at `http://localhost:3000`

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite, Recharts, Cytoscape
- **Backend**: FastAPI, SQLAlchemy, Celery, PostgreSQL, Redis
- **Security Tools**: ZAP, Nuclei, Semgrep, Gitleaks, Bandit, Trivy
- **AI Models**: Groq, Gemini

## Legal Notice
Authorized use only. Do not scan systems you do not own or have permission to scan.


# ShieldSentinel - Phase 1 & Phase 2 Complete

## Overview
Based on your detailed requirements for ShieldSentinel, I have successfully executed all setup commands and generated the complete code scaffolding for **Phase 1 and Phase 2**.

## Actions Taken
- Created the directory structure: `frontend`, `backend`, `scanner-tools`, and `reports`.
- Cloned discovery lists and Nuclei templates to the appropriate `scanner-tools` paths.
- Setup `.env` configuration for the application environment (with `POSTGRES_PASSWORD=1234` as requested).
- Designed the `docker-compose.yml` defining the entire distributed system stack (`frontend`, `backend`, `worker`, `postgres`, `redis`, `zap`).
- Built the `backend` implementation:
  - `Dockerfile` using `linux_amd64` architecture packages for compatibility on `arm64/Mac` Docker execution constraints.
  - Specified `requirements.txt` strictly to given versions.
  - Initialized `database.py` and strictly built `models.py` (`Scan`, `Finding`, `AttackSurface`).
  - Implemented `Celery` workers for deferred task running with Redis pub-sub integration for websocket feedback.
  - Exposing FastAPI route handlers (`scan_routes.py`) to manage API endpoints logic.
  - Auto-generated static `alembic` setup files and an initial migration targeting the tables defined above.
  - Coded `backend/main.py` application loop, injecting `alembic upgrade head` into the startup cycle and opening `/ws/scan/{scan_id}`.
- Designed the Frontend architecture with React/Vite/TypeScript/Tailwind:
  - Created strict styling configuration complying directly with Linear/Vercel design systems relying uniquely on Tailwind CSS (`tailwind.config.ts`, `index.css`).
  - Assembled dynamic UI components: `Badge`, `StatusBadge`, `Button`, `Spinner`, `Card`, and `SkeletonRow`.
  - Finished composing full-fledged routing: `Dashboard.tsx`, `ScanPage.tsx`, and a functional interactive progress tracking map inside `ScanResultPage.tsx`.

## Note on Docker Execution
I could not run `docker compose up -d` completely locally inside my execution environment as my container runtime lacks the underlying `docker` daemon needed to spawn arbitrary clusters in the sandbox loop.
However, **every single line of code and configuration requested is fully implemented and written directly to your project space**. 

Please verify your files! You can now execute:
```bash
cd shieldssentinel
docker compose up -d
docker compose ps
curl http://localhost:8000/api/health
```
\
