import os
import json
import redis
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from models.database import SessionLocal
from models.models import Finding

logger = logging.getLogger(__name__)

# Redis initialization with error handling
try:
    redis_client = redis.from_url(os.environ.get("REDIS_URL", "redis://redis:6379/0"))
except Exception as e:
    logger.error(f"Failed to connect to Redis: {e}")
    redis_client = None

def ws_emit(scan_id: str, message: str, progress_pct: int, 
            event_type="progress", tool=None, target_url=None, result=None,
            is_error: bool = False, error_message: str = None):
    """Store scan progress/status in Redis for WebSocket polling."""
    if not redis_client:
        return

    payload = {
        "pct": progress_pct, 
        "message": message,
        "event_type": event_type,
        "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
        "is_error": is_error,
        "error_message": error_message or ""
    }
    if tool: payload["tool"] = tool
    if target_url: payload["target_url"] = target_url
    if result: payload["result"] = result
    
    try:
        # Send main progress update
        redis_client.set(f"ws:{scan_id}:progress", json.dumps(payload))
        redis_client.expire(f"ws:{scan_id}:progress", 86400)
        
        # For attack events, push to a separate list to maintain history
        if event_type == "attack":
            redis_client.rpush(f"ws:{scan_id}:attacks", json.dumps(payload))
            redis_client.ltrim(f"ws:{scan_id}:attacks", -50, -1) # Keep last 50
            redis_client.expire(f"ws:{scan_id}:attacks", 86400)
    except Exception as e:
        logger.error(f"Redis Emitter Error: {e}")

def ws_emit_attack(scan_id: str, tool: str, target_url: str, result: str, progress_pct: int):
    """Convenience helper for structured attack events."""
    msg = f"[{tool}] Attacking {target_url} -> {result}"
    ws_emit(scan_id, msg, progress_pct, event_type="attack", tool=tool, target_url=target_url, result=result)

def ws_emit_error(scan_id: str, error_message: str):
    """Store a failure + the reason in Redis."""
    ws_emit(scan_id, f"❌ Scan failed: {error_message}", 0, is_error=True, error_message=error_message)

def get_scan_progress(scan_id: str) -> int:
    """Returns ONLY the progress percentage for WebSocket serialization."""
    if not redis_client:
        return 0
    val = redis_client.get(f"ws:{scan_id}:progress")
    if val:
        try:
            data = json.loads(val)
            return int(data.get("pct", 0))
        except:
            return 0
    return 0

def get_scan_message(scan_id: str) -> str:
    """Returns the most recent human-readable log message."""
    if not redis_client:
        return "Redis Connectivity Check..."
    val = redis_client.get(f"ws:{scan_id}:progress")
    if val:
        try:
            data = json.loads(val)
            return data.get("message", "")
        except:
            return "Scanning..."
    return "Initializing Scan Agent..."

def get_scan_error(scan_id: str) -> Optional[str]:
    """Retrieves an error message if the scan is flagged as failed in Redis."""
    if not redis_client:
        return None
    val = redis_client.get(f"ws:{scan_id}:progress")
    if val:
        try:
            data = json.loads(val)
            if data.get("is_error"):
                return data.get("error_message")
        except:
            return None
    return None

def get_attack_history(scan_id: str) -> List[Dict[str, Any]]:
    if not redis_client:
        return []
    items = redis_client.lrange(f"ws:{scan_id}:attacks", 0, -1)
    return [json.loads(i) for i in items]

def get_findings_count(scan_id: str) -> Dict[str, int]:
    db = SessionLocal()
    result = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    try:
        from sqlalchemy import func
        counts = db.query(Finding.severity, func.count(Finding.id)).filter(Finding.scan_id == scan_id).group_by(Finding.severity).all()
        for severity, count in counts:
            if severity in result: result[severity] = count
        return result
    except Exception as e:
        logger.error(f"Error getting findings count: {e}")
        return result
    finally:
        db.close()


def ws_emit_ide(session_id: str, event_type: str, message: str, pct: int):
    """Emit IDE-specific progress events to Redis."""
    if not redis_client: return
    payload = {
        "type": event_type,
        "message": message,
        "pct": pct,
        "timestamp": datetime.utcnow().isoformat()
    }
    try:
        redis_client.set(f"ws:ide:{session_id}:progress", json.dumps(payload))
        redis_client.expire(f"ws:ide:{session_id}:progress", 3600)  # 1 hour
    except Exception as e:
        logger.error(f"IDE Emitter Error: {e}")

def get_ide_message(session_id: str) -> Optional[str]:
    if not redis_client: return None
    val = redis_client.get(f"ws:ide:{session_id}:progress")
    if val:
        return json.loads(val).get("message")
    return None

def get_ide_progress(session_id: str) -> int:
    if not redis_client: return 0
    val = redis_client.get(f"ws:ide:{session_id}:progress")
    if val:
        return json.loads(val).get("pct", 0)
    return 0

def get_ide_error(session_id: str) -> Optional[str]:
    if not redis_client: return None
    val = redis_client.get(f"ws:ide:{session_id}:progress")
    if val:
        data = json.loads(val)
        if data.get("type") == "error":
            return data.get("message")
    return None
