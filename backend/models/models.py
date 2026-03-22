import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String)
    avatar_url = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    plan = Column(String, default='free') # free | pro | enterprise
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    scans = relationship("Scan", back_populates="user")

class Scan(Base):
    __tablename__ = "scans"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    scan_type = Column(String)  # 'url' | 'zip' | 'combined'
    target = Column(String)
    status = Column(String, default='queued', index=True)
    risk_score = Column(Integer, nullable=True)
    intensity = Column(String, default='standard')
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)  # populated when status='failed'
    open_ports = Column(JSONB, nullable=True)    # from nmap
    os_guess = Column(String, nullable=True)      # from nmap
    tech_stack = Column(JSONB, nullable=True)    # from tech fingerprinter
    attack_timeline = Column(JSONB, nullable=True) # sequence of tools and times
    sentinel_analysis = Column(JSONB, nullable=True) # Strategic AI verdict
    findings = relationship("Finding", back_populates="scan")
    user = relationship("User", back_populates="scans")

class Finding(Base):
    __tablename__ = "findings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), index=True)
    vuln_type = Column(String)
    severity = Column(String, index=True)
    url = Column(String, nullable=True)
    parameter = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    line_number = Column(Integer, nullable=True)
    evidence = Column(Text, nullable=True)
    description = Column(Text)
    attack_worked = Column(Boolean, default=True)
    owasp_category = Column(String, nullable=True)
    tool_source = Column(String, nullable=True)
    ai_fix = Column(JSONB, nullable=True)
    waf_rule = Column(JSONB, nullable=True)
    correlated_finding_id = Column(UUID(as_uuid=True), ForeignKey("findings.id"), nullable=True)
    correlation_message = Column(Text, nullable=True)
    
    # New Phase 14 Fields
    attack_examples = Column(JSONB, nullable=True)
    defense_examples = Column(JSONB, nullable=True)
    layman_explanation = Column(Text, nullable=True)
    cvss_score = Column(Float, nullable=True)
    cve_id = Column(String, nullable=True)
    fix_verified = Column(Boolean, default=False)
    fix_verified_at = Column(DateTime, nullable=True)
    was_attempted = Column(Boolean, default=False)
    attack_name = Column(String, nullable=True)
    quick_fix = Column(Text, nullable=True)
    money_loss_min = Column(Integer, nullable=True)
    money_loss_max = Column(Integer, nullable=True)
    confidence_score = Column(Integer, nullable=True)
    verification_status = Column(String, nullable=True) # unverified, verified, suspicious

    created_at = Column(DateTime, default=datetime.utcnow)
    scan = relationship("Scan", back_populates="findings")

class AttackSurface(Base):
    __tablename__ = "attack_surface"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"))
    nodes = Column(JSONB)
    edges = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)

class IDESession(Base):
    __tablename__ = "ide_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_url = Column(String, nullable=False)
    repo_name = Column(String, nullable=False)
    clone_path = Column(String, nullable=False)
    status = Column(String, default="cloning") # cloning|scanning|ready|error
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), nullable=True)
    file_tree = Column(JSONB, nullable=True)
    file_contents = Column(JSONB, nullable=True)
    security_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class IDEFileAnnotation(Base):
    __tablename__ = "ide_file_annotations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("ide_sessions.id"))
    file_path = Column(String, nullable=False)
    line_number = Column(Integer, nullable=False)
    finding_id = Column(UUID(as_uuid=True), ForeignKey("findings.id"), nullable=True)
    annotation_type = Column(String, nullable=False) # 'error'|'warning'|'info'
    message = Column(String, nullable=False)
    quick_fix = Column(Text, nullable=True)

