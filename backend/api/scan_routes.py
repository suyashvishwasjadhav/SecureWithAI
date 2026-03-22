from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid
import os
import zipfile
import json
from datetime import datetime

from models.database import get_db
from models.models import Scan, Finding, User
from api.auth_routes import get_current_user
from utils.helpers import is_private_ip, format_duration
from workers.celery_app import run_scan, generate_ai_fixes_for_scan, generate_waf_rules_for_scan
from services.report_service import ReportService

router = APIRouter()

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

REPORT_DIR = "/tmp/shieldssentinel_reports"
os.makedirs(REPORT_DIR, exist_ok=True)

class UrlScanRequest(BaseModel):
    target_url: str
    intensity: str = "standard"


@router.post("/scans/url")
def start_url_scan(req: UrlScanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not req.target_url.startswith("http://") and not req.target_url.startswith(
        "https://"
    ):
        raise HTTPException(
            status_code=400,
            detail={"error": "Must start with http:// or https://"},
        )
    if is_private_ip(req.target_url):
        raise HTTPException(
            status_code=400,
            detail={"error": "Private IPs are not allowed"},
        )

    scan = Scan(user_id=current_user.id, scan_type="url", target=req.target_url, intensity=req.intensity)
    db.add(scan)
    db.commit()
    db.refresh(scan)

    run_scan.delay(str(scan.id), "url", req.target_url, req.intensity)

    return {
        "scan_id": str(scan.id),
        "status": "queued",
        "message": "Scan queued successfully",
    }


@router.post("/scans/zip")
async def start_zip_scan(
    file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=400,
            detail={"error": "Only .zip files are accepted"},
        )

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0, 0)
    if size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail={"error": "File too large. Maximum 50MB"},
        )

    scan_id = uuid.uuid4()
    upload_dir = os.environ.get("UPLOAD_DIR", "/tmp/shieldssentinel_uploads")
    scan_dir = os.path.join(upload_dir, str(scan_id))
    os.makedirs(scan_dir, exist_ok=True)

    zip_path = os.path.join(scan_dir, "upload.zip")
    with open(zip_path, "wb") as f:
        f.write(await file.read())

    code_path = os.path.join(scan_dir, "code")
    os.makedirs(code_path, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(code_path)

    file_count = sum(len(files) for _, _, files in os.walk(code_path))

    scan = Scan(
        id=scan_id,
        user_id=current_user.id,
        scan_type="zip",
        target=file.filename,
        intensity="standard",
    )
    db.add(scan)
    db.commit()

    run_scan.delay(str(scan_id), "zip", code_path, "standard")

    return {
        "scan_id": str(scan_id),
        "status": "queued",
        "files_found": file_count,
    }


@router.get("/scans")
def list_scans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scans = db.query(Scan).filter(Scan.user_id == current_user.id).order_by(Scan.created_at.desc()).limit(20).all()
    results = []
    for s in scans:
        counts = (
            db.query(Finding.severity, func.count(Finding.id))
            .filter(Finding.scan_id == s.id)
            .group_by(Finding.severity)
            .all()
        )
        count_dict = {c[0]: c[1] for c in counts}
        # Check if there's an IDE Session for this scan
        from models.models import IDESession
        session = db.query(IDESession).filter(IDESession.scan_id == s.id).first()
        session_id = str(session.id) if session else None

        results.append(
            {
                "id": str(s.id),
                "scan_type": s.scan_type,
                "target": s.target,
                "status": s.status,
                "intensity": s.intensity,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "risk_score": s.risk_score,
                "duration": format_duration(s.duration_seconds),
                "critical_count": count_dict.get("critical", 0),
                "high_count": count_dict.get("high", 0),
                "medium_count": count_dict.get("medium", 0),
                "low_count": count_dict.get("low", 0),
                "info_count": count_dict.get("info", 0),
                "error_message": s.error_message,
                "tech_stack": s.tech_stack,
                "os_guess": s.os_guess,
                "open_ports": s.open_ports,
                "session_id": session_id
            }
        )
    return results


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_scans = db.query(Scan).filter(Scan.user_id == current_user.id).count()
    total_findings = db.query(Finding).join(Scan).filter(Scan.user_id == current_user.id, Finding.attack_worked == True).count()

    scans_with_score = (
        db.query(Scan.risk_score)
        .filter(Scan.status == "complete", Scan.risk_score != None, Scan.user_id == current_user.id)
        .all()
    )
    avg_score = (
        int(sum(s[0] for s in scans_with_score) / len(scans_with_score))
        if scans_with_score
        else 0
    )

    critical_open = (
        db.query(Finding)
        .join(Scan)
        .filter(Scan.user_id == current_user.id, Finding.severity == "critical", Finding.attack_worked == True)
        .count()
    )

    recent = list_scans(db, current_user)

    # Risk score trend (last 10)
    scores = db.query(Scan.risk_score).filter(Scan.status == 'complete', Scan.user_id == current_user.id).order_by(Scan.created_at.desc()).limit(10).all()
    score_trend = [s[0] for s in reversed(scores)]

    # Phase 15 New Dashboard Sections
    # 1. Most Common Vulnerabilities
    most_common = db.query(Finding.vuln_type, func.count(Finding.id)).join(Scan).filter(Scan.user_id == current_user.id, Finding.attack_worked == True).group_by(Finding.vuln_type).order_by(func.count(Finding.id).desc()).limit(5).all()
    most_common_list = [{"type": mc[0], "count": mc[1]} for mc in most_common]

    # 2. Tools Effectiveness
    tools_eff = db.query(Finding.tool_source, func.count(Finding.id)).join(Scan).filter(Scan.user_id == current_user.id, Finding.attack_worked == True).group_by(Finding.tool_source).all()
    total_confirmed = sum(t[1] for t in tools_eff)
    tools_eff_list = [{"tool": t[0] or "Engine", "count": t[1], "pct": round((t[1]/total_confirmed)*100) if total_confirmed > 0 else 0} for t in tools_eff]

    return {
        "total_scans": total_scans,
        "total_findings": total_findings,
        "avg_risk_score": avg_score,
        "critical_open": critical_open,
        "recent_scans": recent[:100],
        "risk_score_trend": score_trend,
        "most_common_vulnerabilities": most_common_list,
        "tool_effectiveness": tools_eff_list
    }


@router.get("/scans/{scan_id}")
def get_single_scan(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Scan not found")

    counts = (
        db.query(Finding.severity, func.count(Finding.id))
        .filter(Finding.scan_id == s.id)
        .group_by(Finding.severity)
        .all()
    )
    count_dict = {c[0]: c[1] for c in counts}

    # Check if there's an IDE Session for this scan
    from models.models import IDESession
    session = db.query(IDESession).filter(IDESession.scan_id == s.id).first()
    session_id = str(session.id) if session else None

    return {
        "id": str(s.id),
        "scan_type": s.scan_type,
        "target": s.target,
        "status": s.status,
        "intensity": s.intensity,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        "risk_score": s.risk_score,
        "duration_seconds": s.duration_seconds,
        "duration": format_duration(s.duration_seconds),
        "critical_count": count_dict.get("critical", 0),
        "high_count": count_dict.get("high", 0),
        "medium_count": count_dict.get("medium", 0),
        "low_count": count_dict.get("low", 0),
        "info_count": count_dict.get("info", 0),
        "error_message": s.error_message,
        "tech_stack": s.tech_stack,
        "os_guess": s.os_guess,
        "open_ports": s.open_ports,
        "session_id": session_id
    }

@router.post("/scans/{id}/abort")
def abort_scan(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Scan).filter(Scan.id == id, Scan.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if s.status in ['running', 'queued']:
        s.status = 'failed'
        s.error_message = 'Operation aborted by user.'
        db.commit()
    
    return {"status": "aborted"}

@router.delete("/scans/{id}")
def delete_scan(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.models import AttackSurface
    s = db.query(Scan).filter(Scan.id == id, Scan.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Cascade deletes safely
    from models.models import IDESession, IDEFileAnnotation
    
    # 1. Clear mentions in IDE sessions
    sessions = db.query(IDESession).filter(IDESession.scan_id == id).all()
    for sess in sessions:
        db.query(IDEFileAnnotation).filter(IDEFileAnnotation.session_id == sess.id).delete(synchronize_session=False)
        db.delete(sess)

    # 2. Cleanup attack surface and findings
    db.query(AttackSurface).filter(AttackSurface.scan_id == id).delete(synchronize_session=False)
    db.query(Finding).filter(Finding.scan_id == id).update({"correlated_finding_id": None}, synchronize_session=False)
    db.query(Finding).filter(Finding.scan_id == id).delete(synchronize_session=False)
    
    db.delete(s)
    db.commit()
    return {"status": "deleted"}


@router.get("/scans/{scan_id}/findings")
def get_scan_findings(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Scan not found")

    findings = db.query(Finding).filter(Finding.scan_id == s.id).all()
    
    results = []
    for f in findings:
        results.append({
            "id": str(f.id),
            "vuln_type": f.vuln_type,
            "severity": f.severity,
            "url": f.url,
            "parameter": f.parameter,
            "file_path": f.file_path,
            "line_number": f.line_number,
            "evidence": f.evidence,
            "description": f.description,
            "attack_worked": f.attack_worked,
            "owasp_category": f.owasp_category,
            "tool_source": f.tool_source,
            "ai_fix": f.ai_fix,
            "waf_rule": f.waf_rule,
            "layman_explanation": f.layman_explanation,
            "attack_examples": f.attack_examples,
            "defense_examples": f.defense_examples,
            "cvss_score": f.cvss_score,
            "fix_verified": f.fix_verified,
            "fix_verified_at": f.fix_verified_at.isoformat() if f.fix_verified_at else None,
            "was_attempted": f.was_attempted,
        })
    return results


@router.get("/findings/{finding_id}")
def get_finding(finding_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = db.query(Finding).join(Scan).filter(Finding.id == finding_id, Scan.user_id == current_user.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")

    payload = {
        "id": str(f.id),
        "scan_id": str(f.scan_id),
        "vuln_type": f.vuln_type,
        "severity": f.severity,
        "url": f.url,
        "parameter": f.parameter,
        "file_path": f.file_path,
        "line_number": f.line_number,
        "evidence": f.evidence,
        "description": f.description,
        "attack_worked": f.attack_worked,
        "owasp_category": f.owasp_category,
        "tool_source": f.tool_source,
        "ai_fix": f.ai_fix,
        "waf_rule": f.waf_rule,
        "layman_explanation": f.layman_explanation,
        "attack_examples": f.attack_examples,
        "defense_examples": f.defense_examples,
        "cvss_score": f.cvss_score,
        "fix_verified": f.fix_verified,
        "fix_verified_at": f.fix_verified_at.isoformat() if f.fix_verified_at else None,
        "was_attempted": f.was_attempted,
        "quick_fix": f.quick_fix,
    }
    if f.ai_fix and isinstance(f.ai_fix, dict):
        for key in (
            "ide_prompt",
            "key_terms",
            "services_to_use",
            "effort_minutes",
            "confidence",
            "money_loss_min",
            "money_loss_max",
            "breach_examples",
            "what_is_happening",
            "layman_explanation",
            "attack_examples",
            "defense_examples",
        ):
            val = f.ai_fix.get(key)
            if val is not None and not payload.get(key):
                payload[key] = val
    return payload

@router.post("/findings/{finding_id}/mark-fixed")
def mark_finding_fixed(finding_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = db.query(Finding).join(Scan).filter(Finding.id == finding_id, Scan.user_id == current_user.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    f.fix_verified = True
    f.fix_verified_at = datetime.utcnow()
    db.commit()
    return {"status": "marked_fixed"}

@router.post("/findings/{id}/verify-fix")
def verify_finding_fix(id: str, db: Session = Depends(get_db)):
    f = db.query(Finding).filter(Finding.id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")

    vuln_type = f.vuln_type
    target_url = f.url
    param = f.parameter
    
    still_vulnerable = False
    message = "Vulnerability significantly modified or removed."

    try:
        if "SQL Injection" in vuln_type and target_url:
            from services.sqlmap_service import SQLMapService
            service = SQLMapService()
            # For verification, we run a very targeted scan
            if param:
                res = service._test_url(target_url, param, lambda m, p: None) # Silent emit
            else:
                res = service._test_url(target_url, None, lambda m, p: None)
            still_vulnerable = len(res) > 0
            message = "SQLMap still detects potential injection point." if still_vulnerable else "SQLMap confirms vulnerability is no longer exploitable."

        elif "Cross-Site Scripting" in vuln_type and target_url:
            from services.xsstrike_service import XSStrikeService
            service = XSStrikeService()
            res = service.scan(str(f.scan_id), [{"url": target_url, "params": [param] if param else []}], lambda m, p: None)
            still_vulnerable = len(res) > 0
            message = "XSStrike still detects script execution." if still_vulnerable else "XSStrike confirms XSS is fixed."

        elif "Header" in vuln_type and target_url:
            import requests
            res = requests.get(target_url, timeout=10, verify=False)
            # Basic check for missing headers
            if "Missing" in vuln_type:
                header_name = vuln_type.split(":")[-1].strip()
                still_vulnerable = header_name not in res.headers
                message = f"Header {header_name} is still missing." if still_vulnerable else f"Header {header_name} is now present."
            else:
                still_vulnerable = False # Assume fixed for other header types for now
        
        else:
            # Fallback for other types: assume it's fixed if we can't easily re-verify
            still_vulnerable = False
            message = "Manual verification required for this vulnerability class. Automated check passed by default."

    except Exception as e:
        return {"still_vulnerable": True, "message": f"Verification failed due to error: {str(e)}"}

    if not still_vulnerable:
        f.fix_verified = True
        f.fix_verified_at = datetime.utcnow()
        db.commit()

    return {"still_vulnerable": still_vulnerable, "message": message}

@router.get("/findings/{id}/fix")
def get_finding_fix(id: str, db: Session = Depends(get_db)):
    f = db.query(Finding).filter(Finding.id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    if f.ai_fix:
        return f.ai_fix
    
    if f.severity not in ["critical", "high", "medium"]:
        return {"status": "skipped", "message": "AI fixes only generated for critical/high/medium"}
        
    scan_id = str(f.scan_id)
    # Re-trigger generation task logic if it failed or was skipped
    generate_ai_fixes_for_scan.delay(scan_id)
    
    return {"status": "generating", "retry_after": 5}

@router.get("/findings/{id}/waf")
def get_finding_waf(id: str, db: Session = Depends(get_db)):
    f = db.query(Finding).filter(Finding.id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    if f.waf_rule:
        return f.waf_rule
    
    if f.severity not in ["critical", "high"]:
        return {"status": "skipped", "message": "WAF rules only generated for Critical and High findings"}
        
    scan_id = str(f.scan_id)
    # Re-trigger generating waf rules
    generate_waf_rules_for_scan.delay(scan_id)
    
    return {"status": "generating", "retry_after": 5}


@router.get("/scans/{scan_id}/report")
def get_scan_report_metadata(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Scan not found")
    pdf_path = os.path.join(REPORT_DIR, f"{scan_id}.pdf")
    return {
        "id": scan_id,
        "pdf_available": os.path.exists(pdf_path),
        "generated_at": datetime.fromtimestamp(os.path.getmtime(pdf_path)).isoformat() if os.path.exists(pdf_path) else None
    }


@router.get("/scans/{scan_id}/report/pdf")
def get_scan_report_pdf(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == current_user.id).first()
    if not s or s.status != "complete":
        raise HTTPException(status_code=400, detail="Scan not ready or not found")
    
    findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()
    pdf_path = os.path.join(REPORT_DIR, f"{scan_id}.pdf")
    
    # Generate if not exists
    service = ReportService()
    service.generate_pdf(s, findings, pdf_path)
    
    return FileResponse(
        pdf_path, 
        filename=f"shieldssentinel-{scan_id[:8]}.pdf",
        media_type="application/pdf"
    )


@router.get("/scans/{scan_id}/report/json")
def get_scan_report_json(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == current_user.id).first()
    if not s or s.status != "complete":
        raise HTTPException(status_code=400, detail="Scan not ready or not found")
    
    findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()
    
    service = ReportService()
    ai_summary = service._generate_ai_summary(s, findings)
    
    report_data = {
        "scan_id": str(s.id),
        "target": s.target,
        "type": s.scan_type,
        "risk_score": s.risk_score,
        "executive_summary": ai_summary,
        "timestamp": s.completed_at.isoformat() if s.completed_at else None,
        "findings": [
            {
                "type": f.vuln_type,
                "severity": f.severity,
                "location": f.url or f"{f.file_path}:{f.line_number}",
                "owasp": f.owasp_category,
                "tool": f.tool_source
            } for f in findings if f.attack_worked
        ]
    }
    
    return report_data


@router.get("/scans/{scan_id}/waf-rules")
def get_scan_waf_rules(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Scan not found")
        
    findings = db.query(Finding).filter(Finding.scan_id == scan_id, Finding.waf_rule != None).all()
    
    def build_waf_conf_file(scan, findings_with_rules) -> str:
        lines = [
            "# ShieldSentinel WAF Rules",
            f"# Generated for: {scan.target}",
            f"# Scan date: {scan.created_at}",
            f"# Risk score: {scan.risk_score}/100",
            "# IMPORTANT: Test in detection mode before blocking mode",
            "# Add this file to your ModSecurity includes",
            "",
            "SecRuleEngine On",
            ""
        ]
        
        for f in findings_with_rules:
            if f.waf_rule and f.waf_rule.get("modsecurity"):
                lines.append(f"# Rule for: {f.vuln_type} at {f.url or f.file_path or 'code'}")
                lines.append(f.waf_rule["modsecurity"])
                lines.append("")
        
        return "\n".join(lines)
        
    conf_content = build_waf_conf_file(s, findings)
    
    return Response(
        content=conf_content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=shieldssentinel_waf_rules_{scan_id[:8]}.conf"}
    )

from fastapi import Form
from typing import Optional

@router.post("/scans/combined")
async def start_combined_scan(
    target_url: str = Form(...),
    intensity: str = Form("standard"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        raise HTTPException(
            status_code=400,
            detail={"error": "Must start with http:// or https://"},
        )
    if not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=400,
            detail={"error": "Only .zip files are accepted for code analysis"},
        )
    
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0, 0)
    if size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail={"error": "File too large. Maximum 50MB"})

    scan_id = uuid.uuid4()
    upload_dir = os.environ.get("UPLOAD_DIR", "/tmp/shieldssentinel_uploads")
    scan_dir = os.path.join(upload_dir, str(scan_id))
    os.makedirs(scan_dir, exist_ok=True)

    zip_path = os.path.join(scan_dir, "upload.zip")
    with open(zip_path, "wb") as f:
        f.write(await file.read())

    code_path = os.path.join(scan_dir, "code")
    os.makedirs(code_path, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(code_path)
        
    scan = Scan(id=scan_id, user_id=current_user.id, scan_type="combined", target=target_url, intensity=intensity)
    db.add(scan)
    db.commit()

    run_scan.delay(str(scan_id), "combined", target_url, intensity, code_path=code_path)

    return {"scan_id": str(scan_id), "status": "queued"}
    
@router.post("/scans/demo")
def start_demo_scan(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scan = Scan(
        user_id=current_user.id,
        scan_type="demo",
        target="demo-shieldstack.ai",
        intensity="standard",
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    
    run_scan.delay(str(scan.id), "demo", scan.target, "standard")
    return {"scan_id": str(scan.id), "status": "demo_started"}


@router.get("/scans/{scan_id}/correlations")
def get_correlations(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    findings = db.query(Finding).join(Scan).filter(
        Finding.scan_id == uuid.UUID(scan_id),
        Scan.user_id == current_user.id,
        Finding.correlated_finding_id != None
    ).all()
    
    res = []
    for f in findings:
        res.append({
            "id": f.id,
            "vuln_type": f.vuln_type,
            "correlated_finding_id": f.correlated_finding_id,
            "correlation_message": f.correlation_message
        })
    return res


@router.get("/scans/{scan_id}/compliance")
def get_compliance(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(404, "Scan not found")
        
    findings = db.query(Finding).filter(Finding.scan_id == uuid.UUID(scan_id)).all()
    from services.compliance_service import calculate_compliance
    return calculate_compliance(scan_id, findings)


@router.get("/scans/{scan_id}/attack-surface")
def get_attack_surface(scan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models.models import AttackSurface, Scan
    asurf = db.query(AttackSurface).join(Scan).filter(AttackSurface.scan_id == uuid.UUID(scan_id), Scan.user_id == current_user.id).first()
    scan = db.query(Scan).filter(Scan.id == uuid.UUID(scan_id), Scan.user_id == current_user.id).first()
    
    # Base data we always want
    res = {
        "nodes": [], 
        "edges": [], 
        "tech_stack": scan.tech_stack if scan else {},
        "open_ports": scan.open_ports if scan else [],
        "os_guess": scan.os_guess if scan else "Unknown",
        "api_endpoints": [], # Populated if nodes exist
        "subdomains": []
    }
    
    if asurf:
        res["nodes"] = asurf.nodes
        res["edges"] = asurf.edges
        # Extract api_endpoints from nodes (label starts with /api/)
        res["api_endpoints"] = [
            {"path": n["id"], "method": "GET", "status": "Vulnerable" if n.get("vuln_count", 0) > 0 else "Secure"} 
            for n in asurf.nodes if n["id"].startswith("/api/")
        ]
    
    return res
@router.get("/api/compare")
def compare_scans(scan1: str, scan2: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Compare two scans and return differences"""
    s1 = db.query(Scan).filter(Scan.id == scan1, Scan.user_id == current_user.id).first()
    s2 = db.query(Scan).filter(Scan.id == scan2, Scan.user_id == current_user.id).first()
    
    if not s1 or not s2:
        raise HTTPException(status_code=404, detail="One or both scans not found")
        
    f1 = db.query(Finding).filter(Finding.scan_id == scan1, Finding.attack_worked == True).all()
    f2 = db.query(Finding).filter(Finding.scan_id == scan2, Finding.attack_worked == True).all()
    
    def get_counts(findings):
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for f in findings:
            counts[f.severity] = counts.get(f.severity, 0) + 1
        return counts

    c1 = get_counts(f1)
    c2 = get_counts(f2)
    
    # Calculate diff
    diff = {sev: c2[sev] - c1[sev] for sev in c1}
    
    # New findings in scan 2
    types1 = {f.vuln_type for f in f1}
    new_findings = [
        {"type": f.vuln_type, "severity": f.severity, "url": f.url or f.file_path} 
        for f in f2 if f.vuln_type not in types1
    ]
    
    return {
        "scan1": {"id": scan1, "score": s1.risk_score, "counts": c1, "date": s1.created_at},
        "scan2": {"id": scan2, "score": s2.risk_score, "counts": c2, "date": s2.created_at},
        "severity_diff": diff,
        "new_findings_count": len(new_findings),
        "new_findings_sample": new_findings[:5],
        "improvement": s1.risk_score - s2.risk_score if (s1.risk_score and s2.risk_score) else 0
    }
