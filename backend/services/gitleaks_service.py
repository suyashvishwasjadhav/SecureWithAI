import subprocess
import json
import logging

logger = logging.getLogger(__name__)

class GitleaksService:
    
    def scan(self, code_path: str, scan_id: str, on_progress) -> list:
        on_progress("🔑 Scanning for hardcoded secrets and API keys...", 40)
        output_file = f"/tmp/{scan_id}_gitleaks.json"
        
        cmd = [
            "gitleaks",
            "detect",
            "--source", code_path,
            "--report-format", "json",
            "--report-path", output_file,
            "--no-git",
            "--exit-code", "0"  # don't fail if secrets found
        ]
        
        try:
            subprocess.run(cmd, capture_output=True, timeout=60)
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            if isinstance(e, FileNotFoundError):
                msg = "❌ Gitleaks is not installed on the system server"
                on_progress(msg, 53)
                logger.error(msg)
            else:
                on_progress("⚠️ Gitleaks timed out, skipping...", 53)
            return []
        
        return self.parse_output(output_file, scan_id, on_progress)

    def parse_output(self, output_file: str, scan_id: str, on_progress) -> list:
        findings = []
        
        try:
            with open(output_file) as f:
                content = f.read().strip()
                if not content or content == "null":
                    on_progress("✅ No hardcoded secrets found", 53)
                    return []
                leaks = json.loads(content)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
        
        if not leaks:
            on_progress("✅ No hardcoded secrets found", 53)
            return []
        
        on_progress(f"🚨 Found {len(leaks)} hardcoded secrets!", 53)
        
        for leak in leaks:
            rule_id = leak.get("RuleID", "secret")
            file_path = leak.get("File", "")
            line_num = leak.get("StartLine", 0)
            match = leak.get("Match", "")
            
            # REDACT the actual secret — never store the real value
            redacted_match = self._redact(match)
            
            findings.append({
                "scan_id": scan_id,
                "vuln_type": "Hardcoded Secret",
                "severity": "critical",
                "file_path": file_path,
                "line_number": line_num,
                "evidence": f"Rule: {rule_id} | Match: {redacted_match}",
                "description": f"Hardcoded secret detected matching rule '{rule_id}'. Secret value has been redacted for security. File: {file_path}, Line: {line_num}.",
                "attack_worked": True,
                "owasp_category": "A07:2021 - Identification and Authentication Failures",
                "tool_source": "gitleaks"
            })
        
        return findings

    def _redact(self, match: str) -> str:
        """Show only first 4 chars + asterisks."""
        if len(match) <= 4:
            return "****"
        return match[:4] + "*" * min(len(match) - 4, 12) + "...[REDACTED]"
