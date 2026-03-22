import requests
import logging
import time
from urllib.parse import urlparse, urljoin

logger = logging.getLogger(__name__)

class NativeAttackService:
    """
    Guaranteed Python-native fallback for security tests.
    No external binaries required. Uses requests library.
    """

    def __init__(self, timeout=10):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (ShieldSentinel; SecurityScanner/1.0)",
            "Accept": "*/*"
        })

    def test_xss(self, url: str, param: str) -> dict | None:
        """Test for Reflected XSS using a simple script payload."""
        payload = f"<script>alert('SENTINEL-XSS-{int(time.time())}')</script>"
        try:
            # We assume it's a GET request for now as XSStrike does
            test_url = f"{url}&{param}={payload}" if "?" in url else f"{url}?{param}={payload}"
            resp = self.session.get(test_url, timeout=self.timeout)
            
            if payload in resp.text:
                return {
                    "vuln_type": "Cross Site Scripting (Reflected)",
                    "severity": "high",
                    "url": url,
                    "parameter": param,
                    "evidence": f"Payload found in response: {payload}",
                    "description": f"Reflected XSS confirmed in parameter '{param}'. The server reflected the payload without proper encoding.",
                    "attack_worked": True,
                    "owasp_category": "A03:2021 - Injection",
                    "tool_source": "native-fuzzer"
                }
        except Exception as e:
            logger.error(f"[NativeAttack] XSS test failed for {url}: {e}")
        return None

    def test_sqli(self, url: str, param: str) -> dict | None:
        """Test for basic Error-based SQL Injection."""
        payloads = ["'", "''", "\"", "\\", "') OR '1'='1"]
        for payload in payloads:
            try:
                test_url = f"{url}&{param}={payload}" if "?" in url else f"{url}?{param}={payload}"
                resp = self.session.get(test_url, timeout=self.timeout)
                
                errors = [
                    "sql syntax", "mysql_fetch", "ora-00933", 
                    "postgresql query failed", "sqlite3.OperationalError",
                    "unclosed quotation mark"
                ]
                
                if any(err in resp.text.lower() for err in errors):
                    return {
                        "vuln_type": "SQL Injection",
                        "severity": "critical",
                        "url": url,
                        "parameter": param,
                        "evidence": f"SQL error detected with payload: {payload}",
                        "description": f"Potential SQL Injection in parameter '{param}'. The server returned a database error message.",
                        "attack_worked": True,
                        "owasp_category": "A03:2021 - Injection",
                        "tool_source": "native-fuzzer"
                    }
            except Exception:
                continue
        return None

    def test_command_injection(self, url: str, param: str) -> dict | None:
        """Test for Command Injection using sleep/delay."""
        # This is hard to confirm without timing, but let's try a simple backtick or pipe
        payload = "; sleep 5 ;"
        try:
            start = time.time()
            # If it's post_params, we need a different approach, but let's stick to GET for simplicity or assume caller passes full URL
            # Actually, let's just do a simple check
            resp = self.session.get(f"{url}&{param}={payload}" if "?" in url else f"{url}?{param}={payload}", timeout=15)
            duration = time.time() - start
            
            if duration >= 4.5:
                return {
                    "vuln_type": "Remote OS Command Injection",
                    "severity": "critical",
                    "url": url,
                    "parameter": param,
                    "evidence": f"Server response delayed by {duration:.2f}s with sleep payload",
                    "description": f"Confirmed Remote Command Injection in parameter '{param}'. The server executed the 'sleep' command.",
                    "attack_worked": True,
                    "owasp_category": "A03:2021 - Injection",
                    "tool_source": "native-fuzzer"
                }
        except Exception:
            pass
        return None

    def test_path_traversal(self, url: str, param: str) -> dict | None:
        """Test for Path Traversal / LFI."""
        payloads = ["../../../../etc/passwd", "..\\..\\..\\..\\windows\\win.ini"]
        for payload in payloads:
            try:
                test_url = f"{url}&{param}={payload}" if "?" in url else f"{url}?{param}={payload}"
                resp = self.session.get(test_url, timeout=self.timeout)
                
                if "root:x:0:0:" in resp.text or "[extensions]" in resp.text.lower():
                    return {
                        "vuln_type": "Path Traversal",
                        "severity": "high",
                        "url": url,
                        "parameter": param,
                        "evidence": f"Sensitive file content found with payload: {payload}",
                        "description": f"Path Traversal vulnerability in parameter '{param}'. Local files can be read.",
                        "attack_worked": True,
                        "owasp_category": "A01:2021 - Broken Access Control",
                        "tool_source": "native-fuzzer"
                    }
            except Exception:
                continue
        return None

    def test_ssrf(self, url: str, param: str) -> dict | None:
        """Test for SSRF (basic)."""
        payload = "http://169.254.169.254/latest/meta-data/"
        try:
            test_url = f"{url}&{param}={payload}" if "?" in url else f"{url}?{param}={payload}"
            resp = self.session.get(test_url, timeout=self.timeout)
            
            if "ami-id" in resp.text or "instance-id" in resp.text:
                return {
                    "vuln_type": "Server Side Request Forgery",
                    "severity": "critical",
                    "url": url,
                    "parameter": param,
                    "evidence": f"AWS Metadata found in response via {payload}",
                    "description": f"SSRF vulnerability in parameter '{param}'. The server can be used to scan internal resources.",
                    "attack_worked": True,
                    "owasp_category": "A10:2021 - SSRF",
                    "tool_source": "native-fuzzer"
                }
        except Exception:
            pass
        return None

    def audit_headers(self, url: str) -> list:
        """Audit security headers."""
        findings = []
        try:
            resp = self.session.get(url, timeout=self.timeout)
            headers = resp.headers
            
            checks = {
                "X-Frame-Options": {
                    "vuln": "Missing Anti-clickjacking Header",
                    "msg": "X-Frame-Options header is missing, allowing the site to be embedded in an iframe (clickjacking)."
                },
                "Content-Security-Policy": {
                    "vuln": "Content Security Policy (CSP) Header Not Set",
                    "msg": "CSP header is missing, increasing risk of XSS and data injection."
                },
                "Strict-Transport-Security": {
                    "vuln": "Strict-Transport-Security Header Not Set",
                    "msg": "HSTS header is missing. The site does not force HTTPS, allowing SSL stripping attacks."
                },
                "X-Content-Type-Options": {
                    "vuln": "X-Content-Type-Options Header Missing",
                    "msg": "X-Content-Type-Options: nosniff header is missing, allowing MIME-type sniffing."
                }
            }
            
            for h, info in checks.items():
                if h not in headers:
                    findings.append({
                        "vuln_type": info["vuln"],
                        "severity": "low",
                        "url": url,
                        "description": info["msg"],
                        "attack_worked": True,
                        "was_attempted": True,
                        "owasp_category": "A05:2021 - Security Misconfiguration",
                        "tool_source": "native-auditor"
                    })
        except Exception:
            pass
        return findings

    def audit_cookies(self, url: str) -> list:
        """Audit cookie security flags."""
        findings = []
        try:
            resp = self.session.get(url, timeout=self.timeout)
            for cookie in resp.cookies:
                if not cookie.secure:
                    findings.append({
                        "vuln_type": "Cookie Without Secure Flag",
                        "severity": "medium",
                        "url": url,
                        "parameter": cookie.name,
                        "description": f"The cookie '{cookie.name}' is sent over unencrypted connections.",
                        "attack_worked": True,
                        "was_attempted": True,
                        "owasp_category": "A02:2021 - Cryptographic Failures",
                        "tool_source": "native-auditor"
                    })
                if not cookie.has_nonstandard_attr('HttpOnly'):
                    # Requests CookieJar doesn't have a simple 'httponly' property, 
                    # but we can check the attributes
                    # This is a bit hacky in requests
                    pass
        except Exception:
            pass
        return findings
