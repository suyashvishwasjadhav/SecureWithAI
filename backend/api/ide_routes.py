import uuid
import os
import io
import zipfile
import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from models.database import SessionLocal
from api.auth_routes import get_current_user
from models.models import IDESession, IDEFileAnnotation, Scan, User
from services.github_service import GitHubService
from services.ai_fix_service import AIFixService
from sqlalchemy.orm import Session
from utils.file_scorer import calculate_file_score, get_score_color
from models.models import Finding
from typing import List, Dict, Any

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CloneRequest(BaseModel):
    repo_url: str

class FixRequest(BaseModel):
    finding_id: str
    fixed_code: str

class ChatRequest(BaseModel):
    message: str
    file_path: Any = None

@router.post("/clone")
def clone_repo(req: CloneRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session_id = uuid.uuid4()
    
    # Create a dummy scan explicitly for this ide session so findings have a home
    scan = Scan(
        id=uuid.uuid4(),
        user_id=current_user.id,
        target=req.repo_url,
        scan_type="github",
        status="running"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)  # Ensure the scan is fully persisted and get the ID
    
    # Create the ide session with the committed scan ID
    ide_sess = IDESession(
        id=session_id,
        repo_url=req.repo_url,
        repo_name=req.repo_url.split("github.com/")[-1].replace(".git", ""),
        clone_path=f"/tmp/ide/{session_id}",
        status="cloning",
        scan_id=scan.id  # Use the committed scan ID
    )
    
    db.add(ide_sess)
    db.commit()
    
    # Queue task
    from workers.celery_app import clone_and_scan_repo
    clone_and_scan_repo.delay(str(session_id), req.repo_url)
    
    return {"session_id": str(session_id), "status": "cloning"}

@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    ide_sess = db.query(IDESession).filter(IDESession.id == session_id).first()
    if not ide_sess:
        raise HTTPException(status_code=404, detail="Session not found")
        
    ann_count = (
        db.query(IDEFileAnnotation)
        .filter(IDEFileAnnotation.session_id == ide_sess.id)
        .count()
    )
    crit_count = 0
    ann_rows = (
        db.query(IDEFileAnnotation)
        .filter(IDEFileAnnotation.session_id == ide_sess.id)
        .all()
    )
    fids = [a.finding_id for a in ann_rows if a.finding_id]
    if fids:
        crit_count = (
            db.query(Finding)
            .filter(Finding.id.in_(fids), Finding.severity == "critical")
            .count()
        )

    return {
        "session_id": str(ide_sess.id),
        "status": ide_sess.status,
        "repo_name": ide_sess.repo_name,
        "file_tree": ide_sess.file_tree,
        "security_score": ide_sess.security_score,
        "scan_complete": ide_sess.status == "ready",
        "total_findings": ann_count,
        "critical_count": crit_count,
    }

@router.get("/scan/{scan_id}")
def find_session_by_scan(scan_id: str, db: Session = Depends(get_db)):
    ide_sess = db.query(IDESession).filter(IDESession.scan_id == scan_id).first()
    if not ide_sess:
        return {"session_id": None}
    return {"session_id": str(ide_sess.id)}

@router.get("/{session_id}/file")
def get_file(session_id: str, path: str = Query(...), db: Session = Depends(get_db)):
    ide_sess = db.query(IDESession).filter(IDESession.id == session_id).first()
    if not ide_sess or not ide_sess.file_contents:
        raise HTTPException(status_code=404, detail="Session or contents not found")
        
    content = ide_sess.file_contents.get(path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found in tree")
        
    language = path.split('.')[-1]
    
    annotations = db.query(IDEFileAnnotation).filter(
        IDEFileAnnotation.session_id == session_id,
        IDEFileAnnotation.file_path == path
    ).all()

    fids = [a.finding_id for a in annotations if a.finding_id]
    finding_by_id = {}
    if fids:
        for f in db.query(Finding).filter(Finding.id.in_(fids)).all():
            finding_by_id[f.id] = f

    def _merged_quick_fix(ann: IDEFileAnnotation) -> str | None:
        raw = (ann.quick_fix or "").strip()
        if raw:
            return ann.quick_fix
        if ann.finding_id:
            f = finding_by_id.get(ann.finding_id)
            if f and f.quick_fix and str(f.quick_fix).strip():
                return f.quick_fix
        return None

    return {
        "content": content,
        "language": language,
        "annotations": [
            {
                "line": a.line_number,
                "type": a.annotation_type,
                "message": a.message,
                "finding_id": str(a.finding_id) if a.finding_id else None,
                "quick_fix": _merged_quick_fix(a),
                "severity": (
                    finding_by_id[a.finding_id].severity
                    if a.finding_id and finding_by_id.get(a.finding_id)
                    else ("critical" if a.annotation_type == "error" else "warning")
                ),
            }
            for a in annotations
        ],
    }

@router.get("/{session_id}/findings")
def get_findings(session_id: str, db: Session = Depends(get_db)):
    annotations = db.query(IDEFileAnnotation).filter(
        IDEFileAnnotation.session_id == session_id
    ).all()

    fids = [a.finding_id for a in annotations if a.finding_id]
    finding_by_id: dict = {}
    if fids:
        for f in db.query(Finding).filter(Finding.id.in_(fids)).all():
            finding_by_id[f.id] = f

    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for a in annotations:
        if a.file_path not in grouped:
            grouped[a.file_path] = []
        f = finding_by_id.get(a.finding_id) if a.finding_id else None
        qf = (a.quick_fix or "").strip()
        if not qf and f and f.quick_fix:
            qf = str(f.quick_fix).strip()
        grouped[a.file_path].append(
            {
                "id": str(f.id) if f else str(a.id),
                "annotation_id": str(a.id),
                "line_number": a.line_number,
                "message": a.message,
                "annotation_type": a.annotation_type,
                "quick_fix": qf or None,
                "finding_id": str(f.id) if f else None,
                "vuln_type": f.vuln_type if f else (a.message.split(":", 1)[0].strip() if ":" in a.message else "Finding"),
                "severity": f.severity if f else ("high" if a.annotation_type == "error" else "medium"),
                "description": f.description if f else None,
                "scan_id": str(f.scan_id) if f else None,
                "tool_source": f.tool_source if f else None,
                "layman_explanation": f.layman_explanation if f else None,
            }
        )
    return grouped

@router.post("/{session_id}/fix")
def apply_fix(session_id: str, req: FixRequest, db: Session = Depends(get_db)):
    ide_sess = db.query(IDESession).filter(IDESession.id == session_id).first()
    if not ide_sess:
        raise HTTPException(status_code=404, detail="Not found")
        
    # Find annotation
    ann = db.query(IDEFileAnnotation).filter(
        IDEFileAnnotation.finding_id == req.finding_id,
        IDEFileAnnotation.session_id == session_id
    ).first()
    
    if not ann:
        # Fallback to id
        ann = db.query(IDEFileAnnotation).filter(
            IDEFileAnnotation.id == req.finding_id,
            IDEFileAnnotation.session_id == session_id
        ).first()
        
    if not ann:
        raise HTTPException(status_code=404, detail="Annotation not found")
        
    file_path = ann.file_path
    new_contents = ide_sess.file_contents.copy()
    
    if file_path in new_contents:
        lines = new_contents[file_path].split('\n')
        # Simple replace strategy: line minus 1
        if 0 <= ann.line_number - 1 < len(lines):
            lines[ann.line_number - 1] = req.fixed_code
            new_contents[file_path] = '\n'.join(lines)
            
            ide_sess.file_contents = new_contents
            db.commit()
            
            # Recreate clone files? Optional for zip
            
    return {"status": "applied", "file_path": file_path, "line": ann.line_number}

@router.get("/{session_id}/download")
def download_code(session_id: str, db: Session = Depends(get_db)):
    ide_sess = db.query(IDESession).filter(IDESession.id == session_id).first()
    if not ide_sess or not ide_sess.file_contents:
        raise HTTPException(status_code=404)
        
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zipf:
        for filepath, content in ide_sess.file_contents.items():
            zipf.writestr(filepath, content)
            
        zipf.writestr("SECURITY_REPORT.md", "# ShieldSentinel\n\nCode secured by ShieldSentinel.")
        
    zip_buffer.seek(0)
    
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={ide_sess.repo_name.replace('/','_')}_secured.zip"
        }
    )

@router.post("/{session_id}/chat")
def chat(session_id: str, req: ChatRequest, db: Session = Depends(get_db)):
    ide_sess = db.query(IDESession).filter(IDESession.id == session_id).first()
    file_ctx = ""
    if req.file_path and ide_sess and ide_sess.file_contents:
        file_ctx = ide_sess.file_contents.get(req.file_path, "")

    ai_service = AIFixService()
    prompt = (
        f"User question: {req.message}\n\n"
        f"Active file: {req.file_path or '(none)'}\n\n"
        f"File excerpt (first 2000 chars):\n{file_ctx[:2000]}\n\n"
        "Answer concisely with concrete security-oriented guidance for this codebase."
    )
    try:
        reply = ai_service.llm.chat(
            [{"role": "user", "content": prompt}],
            system_prompt="You are ShieldSentinel — a senior application security engineer.",
        )
    except Exception as e:
        logger.warning("IDE chat LLM failed: %s", e)
        reply = (
            "The AI backend is not reachable. Please check your OPENROUTER_API_KEY or GROQ_API_KEY configurations. "
            "Meanwhile: validate all user input server-side, use parameterized SQL, avoid render_template_string with "
            "untrusted data, set HttpOnly+Secure+SameSite cookies, and add a strict Content-Security-Policy."
        )

    return {"reply": reply}

@router.post("/{session_id}/fix-all")
def fix_all_critical(session_id: str, db: Session = Depends(get_db)):
    ide_sess = db.query(IDESession).filter(IDESession.id == session_id).first()
    if not ide_sess or not ide_sess.file_contents:
        raise HTTPException(status_code=404)

    annotations = (
        db.query(IDEFileAnnotation)
        .filter(IDEFileAnnotation.session_id == session_id)
        .order_by(IDEFileAnnotation.annotation_type.asc())
        .all()
    )

    applied_count = 0
    modified_files = set()
    new_contents = ide_sess.file_contents.copy()
    skipped = 0

    for ann in annotations:
        fix_text = (ann.quick_fix or "").strip()
        if not fix_text and ann.finding_id:
            f = db.query(Finding).filter(Finding.id == ann.finding_id).first()
            if f and f.quick_fix:
                fix_text = str(f.quick_fix).strip()
        if not fix_text:
            skipped += 1
            continue

        if ann.file_path in new_contents:
            lines = new_contents[ann.file_path].split("\n")
            if 0 <= ann.line_number - 1 < len(lines):
                lines[ann.line_number - 1] = fix_text
                new_contents[ann.file_path] = "\n".join(lines)
                applied_count += 1
                modified_files.add(ann.file_path)
                db.delete(ann)

    if applied_count > 0:
        ide_sess.file_contents = new_contents
        db.commit()

    return {
        "applied_count": applied_count,
        "modified_files": list(modified_files),
        "skipped_count": skipped,
    }
