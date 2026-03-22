import subprocess
import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class TruffleHogService:
    
    def scan(self, code_path: str, scan_id: str, on_progress) -> list:
        on_progress("🐷 TruffleHog deep secret scan...", 45)
        output_file = f"/tmp/{scan_id}_truffle.json"
        
        # We use trufflehog3 (cli-only) or whatever is installed. 
        # The user requested 'trufflehog3'
        cmd = [
            "trufflehog3",
            "--format", "json",
            "--output", output_file,
            "filesystem",
            code_path
        ]
        
        try:
            # Note: subprocess.run is better than os.system for capture
            subprocess.run(cmd, capture_output=True, timeout=60)
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            if isinstance(e, FileNotFoundError):
                msg = "❌ TruffleHog (trufflehog3) is not installed"
                on_progress(msg, 45)
                logger.error(msg)
            else:
                on_progress("⚠️ TruffleHog timed out, skipping...", 45)
            return []
        except Exception as e:
            logger.error(f"[TruffleHog] Scan failed: {e}")
            return []
        
        return self.parse_output(output_file, scan_id)
    
    def parse_output(self, output_file: str, scan_id: str) -> list:
        findings = []
        if not Path(output_file).exists():
            return []

        try:
            with open(output_file) as f:
                content = f.read()
                # Some versions of trufflehog output a JSON list, others line-delimited.
                # Let's try parsing it as a list first.
                try:
                    data = json.loads(content)
                    items = data if isinstance(data, list) else [data]
                except:
                    # Line-delimited JSON
                    items = [json.loads(line) for line in content.splitlines() if line.strip()]

                for item in items:
                    findings.append({
                        "scan_id": scan_id,
                        "vuln_type": "Hardcoded Secret",
                        "severity": "critical",
                        "file_path": item.get("path",""),
                        "evidence": "Secret detected [REDACTED]",
                        "description": f"TruffleHog detected secret: {item.get('reason','')}",
                        "attack_worked": True,
                        "was_attempted": True,
                        "owasp_category": "A07:2021 - Identification Failures",
                        "tool_source": "trufflehog"
                    })
        except Exception as e:
            logger.error(f"[TruffleHog] Parsing error: {e}")
        return findings
