import subprocess
import json
import os
import logging
from pathlib import Path
from utils.sast_noise_filter import should_drop_semgrep_finding

logger = logging.getLogger(__name__)

class SemgrepService:

    SEVERITY_MAP = {
        "ERROR": "high",
        "WARNING": "medium", 
        "INFO": "low"
    }

    VULN_TYPE_MAP = {
        "sql": "SQL Injection",
        "sqli": "SQL Injection",
        "injection": "SQL Injection",
        "xss": "Cross-Site Scripting",
        "cross-site-scripting": "Cross-Site Scripting",
        "ssrf": "Server-Side Request Forgery",
        "path-traversal": "Path Traversal",
        "traversal": "Path Traversal",
        "hardcoded": "Hardcoded Secret",
        "secret": "Hardcoded Secret",
        "password": "Hardcoded Secret",
        "weak-crypto": "Weak Cryptography",
        "crypto": "Weak Cryptography",
        "md5": "Weak Cryptography",
        "sha1": "Weak Cryptography",
        "eval": "Code Injection",
        "exec": "Code Injection",
        "deserializ": "Insecure Deserialization",
        "pickle": "Insecure Deserialization",
        "xxe": "XML External Entity",
        "csrf": "CSRF",
        "open-redirect": "Open Redirect",
        "redirect": "Open Redirect",
        "jwt": "Broken Authentication",
        "auth": "Broken Authentication",
    }

    def scan(self, code_path: str, scan_id: str, on_progress) -> list:
        on_progress("🔍 Running Semgrep pattern analysis...", 15)
        
        # p/ci is OWASP-oriented and less noisy than --config=auto on HTML/templates.
        # Fallback to auto if p/ci is unavailable (older Semgrep).
        cmd = [
            "semgrep",
            "--config=p/ci",
            "--json",
            "--timeout=60",
            "--max-memory=2000",
            "--jobs=2",
            code_path
        ]
        
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=180
            )

            if result.returncode != 0 and "p/ci" in cmd:
                on_progress("⚠️ Semgrep p/ci failed, retrying with --config=auto", 38)
                cmd = [
                    "semgrep",
                    "--config=auto",
                    "--json",
                    "--timeout=60",
                    "--max-memory=2000",
                    "--jobs=2",
                    code_path,
                ]
                result = subprocess.run(
                    cmd, capture_output=True, text=True, timeout=180
                )

            if not result.stdout.strip():
                on_progress("⚠️ Semgrep returned no output", 38)
                return []
            
            data = json.loads(result.stdout)
            findings = self.parse_results(data.get("results", []), scan_id, code_path)
            on_progress(f"🔍 Semgrep found {len(findings)} issues", 38)
            return findings
            
        except subprocess.TimeoutExpired:
            on_progress("⚠️ Semgrep timed out, partial results", 38)
            return []
        except (json.JSONDecodeError, FileNotFoundError) as e:
            if isinstance(e, FileNotFoundError):
                msg = "❌ Semgrep is not installed on the system server"
                on_progress(msg, 38)
                logger.error(msg)
            else:
                on_progress(f"⚠️ Semgrep error: {str(e)[:50]}", 38)
            return []

    def parse_results(self, results: list, scan_id: str, base_path: str) -> list:
        findings = []
        
        for r in results:
            check_id = r.get("check_id", "").lower()
            severity = self.SEVERITY_MAP.get(r.get("extra", {}).get("severity", "INFO"), "low")
            
            # Upgrade severity for critical patterns
            if any(k in check_id for k in ["sql", "sqli", "injection", "secret", "hardcoded", "rce"]):
                severity = "high"
            if "password" in check_id and "hardcoded" in check_id:
                severity = "critical"
            
            vuln_type = self._map_vuln_type(check_id)
            
            # Get relative file path
            full_path = r.get("path", "")
            try:
                rel_path = str(Path(full_path).relative_to(base_path))
            except:
                rel_path = full_path
            
            code_snippet = r.get("extra", {}).get("lines", "")[:200]
            message = r.get("extra", {}).get("message", "")[:500]
            
            row = {
                "scan_id": scan_id,
                "vuln_type": vuln_type,
                "severity": severity,
                "file_path": rel_path,
                "line_number": r.get("start", {}).get("line"),
                "evidence": code_snippet,
                "description": message,
                "attack_worked": severity in ["critical", "high", "medium"],
                "owasp_category": self._map_owasp(check_id),
                "tool_source": "semgrep",
            }
            if should_drop_semgrep_finding(r, row):
                continue
            findings.append(row)

        return findings

    def _map_vuln_type(self, check_id: str) -> str:
        check_lower = check_id.lower()
        for keyword, vuln_type in self.VULN_TYPE_MAP.items():
            if keyword in check_lower:
                return vuln_type
        return "Security Issue"

    def _map_owasp(self, check_id: str) -> str:
        check_lower = check_id.lower()
        if any(k in check_lower for k in ["sql", "injection", "xss", "eval"]):
            return "A03:2021 - Injection"
        if any(k in check_lower for k in ["secret", "password", "crypto", "md5"]):
            return "A02:2021 - Cryptographic Failures"
        if any(k in check_lower for k in ["auth", "jwt", "session"]):
            return "A07:2021 - Identification Failures"
        if any(k in check_lower for k in ["traversal", "path", "redirect"]):
            return "A01:2021 - Broken Access Control"
        if "ssrf" in check_lower:
            return "A10:2021 - SSRF"
        if "deserializ" in check_lower:
            return "A08:2021 - Deserialization"
        return "A05:2021 - Security Misconfiguration"
