from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import redis
import json
import os
import uuid
import asyncio
from datetime import datetime

from models.database import get_db
from models.models import Scan, Finding
from services.smart_llm_router import smart_router

redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
CHAT_HISTORY_EXPIRE = 86400  # 24 hours
MAX_HISTORY = 20

def get_chat_history(scan_id: str) -> list:
    key = f"chat:{scan_id}:history"
    data = redis_client.get(key)
    return json.loads(data) if data else []

def save_chat_history(scan_id: str, history: list):
    key = f"chat:{scan_id}:history"
    redis_client.setex(key, CHAT_HISTORY_EXPIRE, json.dumps(history[-MAX_HISTORY:]))

def build_scan_context(scan, findings: list) -> str:
    critical = [f for f in findings if f.severity == "critical" and f.attack_worked]
    high = [f for f in findings if f.severity == "high" and f.attack_worked]
    medium = [f for f in findings if f.severity == "medium" and f.attack_worked]
    blocked = [f for f in findings if not f.attack_worked]
    
    context = f"""SCAN DETAILS:
Target: {scan.target}
Type: {scan.scan_type}
Risk Score: {scan.risk_score}/100
Date: {scan.created_at.strftime('%Y-%m-%d %H:%M') if scan.created_at else 'Unknown'}

FINDING COUNTS:
Critical: {len(critical)}, High: {len(high)}, Medium: {len(medium)}, Protected: {len(blocked)}

CRITICAL VULNERABILITIES:"""
    
    for f in critical[:5]:
        location = f.url or f"{f.file_path}:{f.line_number}" or "unknown"
        context += f"\n- {f.vuln_type} at {location}"
        if f.ai_fix and f.ai_fix.get("ai_suggestion"):
            context += f" → Fix: {f.ai_fix['ai_suggestion']}"
    
    context += "\n\nHIGH VULNERABILITIES:"
    for f in high[:5]:
        location = f.url or f"{f.file_path}:{f.line_number}" or "unknown"
        context += f"\n- {f.vuln_type} at {location}"
    
    context += "\n\nPROTECTED AGAINST:"
    for f in blocked[:8]:
        context += f"\n- {f.vuln_type}"
    
    return context

router = APIRouter(prefix="/api/scans", tags=["chat"])

class ChatRequest(BaseModel):
    message: str

@router.post("/{scan_id}/chat")
async def chat(scan_id: str, req: ChatRequest, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(404, "Scan not found")
    if scan.status != "complete":
        raise HTTPException(400, "Scan not complete yet")
    
    findings = db.query(Finding).filter(Finding.scan_id == uuid.UUID(scan_id)).all()
    context = build_scan_context(scan, findings)
    
    system_prompt = f"""You are ShieldSentinel AI — an expert web security analyst assistant.
You are answering questions about a specific security scan report.

{context}

INSTRUCTIONS:
- Answer specifically based on THIS scan's data. Never give generic advice.
- For code questions: show before/after code examples.
- For vulnerability explanations: be clear for non-security developers.
- Use markdown formatting (headers, bold, code blocks).
- Be concise but complete. Max 4 paragraphs per response.
- Always mention the specific vulnerability location when relevant.
- If asked for an executive summary, write a professional 3-paragraph report."""
    
    history = get_chat_history(scan_id)
    history.append({"role": "user", "content": req.message})
    
    try:
        response = smart_router.chat(
            messages=history,
            system_prompt=system_prompt,
            max_tokens=800
        )
    except Exception as e:
        raise HTTPException(500, f"AI unavailable: {str(e)}")
    
    history.append({"role": "assistant", "content": response})
    save_chat_history(scan_id, history)
    
    return {"reply": response, "scan_id": scan_id}

@router.delete("/{scan_id}/chat")
async def clear_chat(scan_id: str):
    redis_client.delete(f"chat:{scan_id}:history")
    return {"status": "cleared"}

@router.get("/{scan_id}/chat/suggested")
async def get_suggested_prompts(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(404, "Scan not found")

    findings = db.query(Finding).filter(
        Finding.scan_id == uuid.UUID(scan_id),
        Finding.attack_worked == True
    ).order_by(Finding.severity).limit(5).all() # Simplistic sort
    
    prompts = ["What is the most critical vulnerability?", "What should I fix first?"]
    
    # Actually sort findings in memory for severity logic
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    findings_sorted = sorted(findings, key=lambda f: severity_order.get(f.severity, 99))

    if findings_sorted:
        top = findings_sorted[0]
        prompts.append(f"Explain the {top.vuln_type} vulnerability in simple terms")
        prompts.append(f"How do I fix the {top.vuln_type}?")
    
    prompts.append("Generate an executive summary for my manager")
    
    return {"prompts": prompts[:5]}


@router.get("/{scan_id}/chat/stream")
async def chat_stream(scan_id: str, message: str, db: Session = Depends(get_db)):
    """Server-Sent Events streaming for typewriter effect."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        return StreamingResponse(
            (f"data: {json.dumps({'error': 'Scan not found'})}\n\n" for _ in range(1)),
            media_type="text/event-stream"
        )

    findings = db.query(Finding).filter(Finding.scan_id == uuid.UUID(scan_id)).all()
    context = build_scan_context(scan, findings)
    history = get_chat_history(scan_id)
    
    system_prompt = f"""You are ShieldSentinel AI — an expert web security analyst assistant.
You are answering questions about a specific security scan report.

{context}

INSTRUCTIONS:
- Answer specifically based on THIS scan's data. Never give generic advice.
- For code questions: show before/after code examples.
- For vulnerability explanations: be clear for non-security developers.
- Use markdown formatting (headers, bold, code blocks).
- Be concise but complete. Max 4 paragraphs per response.
- Always mention the specific vulnerability location when relevant.
- If asked for an executive summary, write a professional 3-paragraph report."""
    
    history.append({"role": "user", "content": message})
    
    async def event_stream():
        full_response = ""
        
        try:
            # Use smart_router for streaming-like response
            full_response = smart_router.chat(
                messages=history,
                system_prompt=system_prompt,
                max_tokens=800
            )
            
            # Simulate streaming by chunking the response
            words = full_response.split(" ")
            for i, word in enumerate(words):
                yield f"data: {json.dumps({'token': word + (' ' if i < len(words) - 1 else '')})}\n\n"
                await asyncio.sleep(0.01)
                
        except Exception as e:
            try:
                # Final fallback if everything fails
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            except Exception as e2:
                yield f"data: {json.dumps({'error': 'Streaming failed completely'})}\n\n"
        
        if full_response:
            history.append({"role": "assistant", "content": full_response})
            save_chat_history(scan_id, history)
        
        yield f"data: {json.dumps({'done': True})}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
