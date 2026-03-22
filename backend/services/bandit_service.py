import subprocess
import json
import logging

logger = logging.getLogger(__name__)

class BanditService:

    def scan(self, code_path: str, scan_id: str, on_progress) -> list:
        on_progress("🐍 Running Python security checks (Bandit)...", 55)
        output_file = f"/tmp/{scan_id}_bandit.json"
        
        cmd = [
            "bandit",
            "-r", code_path,
            "-f", "json",
            "-o", output_file,
            "-ll",  # low severity threshold
            "--quiet"
        ]
        
        try:
            subprocess.run(cmd, capture_output=True, timeout=120)
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            if isinstance(e, FileNotFoundError):
                msg = "❌ Bandit is not installed on the system server"
                on_progress(msg, 55)
                logger.error(msg)
            else:
                on_progress("⚠️ Bandit timed out, skipping...", 55)
            return []
        
        return self.parse_output(output_file, scan_id)

    def parse_output(self, output_file: str, scan_id: str) -> list:
        findings = []
        SEV_MAP = {"HIGH": "high", "MEDIUM": "medium", "LOW": "low"}
        
        try:
            with open(output_file) as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
        
        for r in data.get("results", []):
            severity = SEV_MAP.get(r.get("issue_severity", "LOW"), "low")
            confidence = r.get("issue_confidence", "LOW")
            
            # Skip low confidence + low severity (too noisy)
            if severity == "low" and confidence == "LOW":
                continue
            
            findings.append({
                "scan_id": scan_id,
                "vuln_type": self._bandit_to_vuln_type(r.get("test_id", ""), r.get("issue_text", "")),
                "severity": severity,
                "file_path": r.get("filename", ""),
                "line_number": r.get("line_number"),
                "evidence": r.get("code", "")[:200],
                "description": f"{r.get('issue_text', '')} (Bandit: {r.get('test_id', '')})",
                "attack_worked": severity in ["high", "medium"],
                "owasp_category": "A03:2021 - Injection",
                "tool_source": "bandit"
            })
        
        return findings

    def _bandit_to_vuln_type(self, test_id: str, text: str) -> str:
        t = test_id.lower() + text.lower()
        if "sql" in t: return "SQL Injection"
        if "shell" in t or "subprocess" in t: return "Command Injection"
        if "pickle" in t: return "Insecure Deserialization"
        if "md5" in t or "sha1" in t: return "Weak Cryptography"
        if "hardcoded" in t or "password" in t: return "Hardcoded Secret"
        if "assert" in t: return "Debug Code in Production"
        if "yaml" in t: return "Insecure YAML Load"
        if "xml" in t: return "XML Injection"
        return "Python Security Issue"
