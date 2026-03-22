from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import asyncio
import os

from utils.db_helpers import get_scan_from_db
from utils.ws_helpers import get_scan_progress, get_scan_message, get_findings_count, get_scan_error
from api.scan_routes import router as scan_router
from api.chat_routes import router as chat_router
from api.auth_routes import router as auth_router
from api.ide_routes import router as ide_router

app = FastAPI(title="ShieldSentinel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Frontend app
        "http://localhost:4000",   # Marketing / Auth site
        "http://localhost:8000",   # Backend (self)
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan_router, prefix="/api")
app.include_router(chat_router)
app.include_router(auth_router, prefix="/api")
app.include_router(ide_router, prefix="/api/ide")

@app.on_event("startup")
async def startup_event():
    import subprocess
    # Auto-stamp at base if this is an existing DB without alembic tracking
    check = subprocess.run(
        ["alembic", "current"],
        capture_output=True, text=True
    )
    if "No such table" in check.stderr or "alembic_version" in check.stderr or check.returncode != 0:
        # DB exists but alembic_version table missing — stamp at 0001 before upgrading
        os.system("alembic stamp 0001")
    os.system("alembic upgrade head")
    os.makedirs(os.environ.get("UPLOAD_DIR", "/tmp/shieldssentinel_uploads"), exist_ok=True)

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0", "timestamp": datetime.utcnow().isoformat()}

@app.websocket("/ws/scan/{scan_id}")
async def scan_websocket(websocket: WebSocket, scan_id: str):
    await websocket.accept()
    try:
        while True:
            scan = get_scan_from_db(scan_id)
            if not scan:
                await websocket.send_json({"error": "Scan not found"})
                break

            # Build base payload
            payload = {
                "status": scan.status,
                "progress_pct": get_scan_progress(scan_id),
                "message": get_scan_message(scan_id),
                "findings_count": get_findings_count(scan_id),
                "risk_score": scan.risk_score,
            }

            # If scan failed, attach the reason from both DB and Redis
            if scan.status == "failed":
                # Prefer Redis (most recent), fall back to DB column
                error_from_redis = get_scan_error(scan_id)
                error_message = error_from_redis or scan.error_message or "Internal engine error. Check worker logs."
                payload["is_error"] = True
                payload["error_message"] = error_message
                payload["message"] = f"❌ {error_message}"

            await websocket.send_json(payload)

            if scan.status in ["complete", "failed"]:
                break

            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass


@app.websocket("/ws/ide/{session_id}")
async def ide_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    from utils.ws_helpers import get_ide_message, get_ide_progress, get_ide_error
    last_msg = None
    last_pct = -1
    try:
        while True:
            msg = get_ide_message(session_id)
            pct = get_ide_progress(session_id)
            err = get_ide_error(session_id)
            
            if err:
                await websocket.send_json({"type": "error", "message": err, "pct": 0})
                break
                
            if msg and (msg != last_msg or pct != last_pct):
                await websocket.send_json({"type": "progress", "message": msg, "pct": pct})
                last_msg = msg
                last_pct = pct
                
            elif not msg:
                # Fallback to DB check
                from models.database import SessionLocal
                from models.models import IDESession
                db = SessionLocal()
                try:
                    sess = db.query(IDESession).filter(IDESession.id == session_id).first()
                    if sess and sess.status == "ready" and last_pct < 100:
                        await websocket.send_json({"type": "progress", "message": "Analysis ready", "pct": 100})
                        last_pct = 100
                finally:
                    db.close()
                    
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
