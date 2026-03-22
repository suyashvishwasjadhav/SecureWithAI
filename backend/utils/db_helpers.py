import uuid
import logging
from datetime import datetime

from models.database import SessionLocal
from models.models import Scan, Finding, AttackSurface

logger = logging.getLogger(__name__)


def update_scan_status(scan_id: str, status: str, db=None):
    close = False
    if db is None:
        db = SessionLocal()
        close = True
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = status
            db.commit()
    finally:
        if close:
            db.close()


def update_scan(scan_id: str, db=None, **kwargs):
    close = False
    if db is None:
        db = SessionLocal()
        close = True
    try:
        db.query(Scan).filter(Scan.id == scan_id).update(kwargs)
        db.commit()
    finally:
        if close:
            db.close()


def get_scan_from_db(scan_id: str) -> Scan:
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            db.expunge(scan)
        return scan
    finally:
        db.close()


def get_findings_count(scan_id: str) -> int:
    db = SessionLocal()
    try:
        return db.query(Finding).filter(Finding.scan_id == scan_id).count()
    finally:
        db.close()


def save_findings_to_db(db, scan_id: str, findings: list, attacks_blocked: list):
    """Save all findings. Also store attacks_blocked as finding records with attack_worked=False."""

    for f in findings:
        finding = Finding(
            scan_id=uuid.UUID(scan_id) if isinstance(scan_id, str) else scan_id,
            vuln_type=f.get("vuln_type", "Unknown"),
            severity=f.get("severity", "info"),
            url=f.get("url"),
            parameter=f.get("parameter"),
            evidence=f.get("evidence"),
            description=f.get("description", ""),
            attack_worked=f.get("attack_worked", True),
            owasp_category=f.get("owasp_category"),
            tool_source=f.get("tool_source"),
            file_path=f.get("file_path"),
            line_number=f.get("line_number"),
            confidence_score=f.get("confidence_score"),
            verification_status=f.get("verification_status"),
            was_attempted=f.get("was_attempted", True),
        )
        db.add(finding)

    for blocked in attacks_blocked:
        finding = Finding(
            scan_id=uuid.UUID(scan_id) if isinstance(scan_id, str) else scan_id,
            vuln_type=blocked["attack_type"],
            severity="info",
            description=blocked["message"],
            attack_worked=False,
            tool_source="analysis",
        )
        db.add(finding)

    db.commit()
    logger.info(
        f"[DB] Saved {len(findings)} findings + {len(attacks_blocked)} blocked attacks for scan {scan_id}"
    )


def save_attack_surface(scan_id: str, target_url: str, all_urls: list, findings: list, db):
    """Build and save attack surface using the service."""
    from services.attack_surface_service import build_attack_surface
    
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        return
    
    data = build_attack_surface(scan, all_urls, findings)

    surface = AttackSurface(
        scan_id=uuid.UUID(scan_id) if isinstance(scan_id, str) else scan_id,
        nodes=data["nodes"],
        edges=data["edges"],
    )
    db.add(surface)
    db.commit()
    logger.info(f"[DB] Saved attack surface for scan {scan_id}")
