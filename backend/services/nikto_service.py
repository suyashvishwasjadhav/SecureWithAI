import subprocess
import json
import logging
import os

logger = logging.getLogger(__name__)

class NiktoService:

    def scan(self, target_url: str, scan_id: str, on_progress) -> list:
        """
        Nikto tests for: outdated software, dangerous files,
        server misconfigs, default credentials, backup files.
        """
        on_progress("🔎 Running Nikto web server audit...", 65)
        output_file = f"/tmp/{scan_id}_nikto.json"
        
        cmd = [
            "nikto",
            "-h", target_url,
            "-o", output_file,
            "-Format", "json",
            "-timeout", "10",
            "-maxtime", "120s",
            "-nointeractive"
        ]
        
        try:
            subprocess.run(cmd, capture_output=True, text=True, timeout=150)
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.error(f"[Nikto] Scan error: {e}")
            return []
        
        return self.parse_output(output_file, scan_id)

    def parse_output(self, output_file: str, scan_id: str) -> list:
        findings = []
        
        if not os.path.exists(output_file):
            return []

        try:
            with open(output_file) as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"[Nikto] Parse error: {e}")
            return []
        
        # Nikto JSON structure: {"vulnerabilities": [...]} or sometimes nested
        vulnerabilities = data.get("vulnerabilities", [])
        
        for vuln in vulnerabilities:
            msg = vuln.get("msg", "")
            osvdb = vuln.get("OSVDB", "0")
            uri = vuln.get("url", "") or vuln.get("uri", "")
            
            # Classify severity from message content
            if any(k in msg.lower() for k in ["default password", "backdoor", "rce", "command exec"]):
                severity = "critical"
            elif any(k in msg.lower() for k in ["outdated", "vulnerable version", "allowed", "exposed"]):
                severity = "high"
            elif any(k in msg.lower() for k in ["found", "backup", "test", "debug"]):
                severity = "medium"
            else:
                severity = "low"
            
            findings.append({
                "scan_id": scan_id,
                "vuln_type": "Server Misconfiguration",
                "severity": severity,
                "url": uri,
                "evidence": msg[:300],
                "description": f"Nikto found: {msg}. OSVDB: {osvdb}",
                "attack_worked": severity in ["critical", "high", "medium"],
                "owasp_category": "A05:2021 - Security Misconfiguration",
                "tool_source": "nikto"
            })
        
        return findings
