import subprocess
import json
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

TEMPLATES_PATH = os.getenv("NUCLEI_TEMPLATES", "/scanner-tools/nuclei-templates")


class NucleiService:

    def run_scan(self, target_url: str, scan_id: str, on_progress) -> list:
        output_file = f"/tmp/{scan_id}_nuclei.jsonl"

        cmd = [
            "nuclei",
            "-u", target_url,
            "-json-export", output_file,
            "-severity", "critical,high,medium",
            "-tags", "cve,sqli,xss,ssrf,lfi,rce,misconfig,auth,exposure",
            "-timeout", "10",
            "-rate-limit", "100",
            "-concurrency", "50",
            "-silent",
            "-no-interactsh",
        ]

        if Path(TEMPLATES_PATH).exists():
            cmd.extend(["-t", TEMPLATES_PATH])

        on_progress("🔍 Running Nuclei template scan...", 65)

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=300
            )
            logger.info(f"[Nuclei] Exit code: {result.returncode}")
        except subprocess.TimeoutExpired:
            on_progress("⚠️ Nuclei timed out, continuing...", 78)
            return []
        except Exception as e:
            logger.error(f"[Nuclei] Runtime error: {e}")
            return []

        return self.parse_output(output_file, scan_id)

    def parse_output(self, output_file: str, scan_id: str) -> list:
        findings = []

        if not Path(output_file).exists():
            logger.warning(f"[Nuclei] Output file not found: {output_file}")
            return []

        try:
            with open(output_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        # Handle both single object (JSONL) and list of objects
                        items = data if isinstance(data, list) else [data]
                        
                        for item in items:
                            if not isinstance(item, dict):
                                continue
                                
                            info = item.get("info", {})
                            severity = info.get("severity", "info").lower()
                            if severity == "unknown":
                                severity = "info"

                            vuln_name = info.get("name", item.get("template-id", "Unknown"))

                            findings.append(
                                {
                                    "scan_id": scan_id,
                                    "vuln_type": vuln_name,
                                    "severity": severity,
                                    "url": item.get("matched-at") or item.get("host"),
                                    "parameter": None,
                                    "evidence": str(item.get("extracted-results", ""))[:300],
                                    "description": info.get("description", "")[:500],
                                    "attack_worked": severity in ["critical", "high", "medium"],
                                    "owasp_category": self._map_owasp(item),
                                    "tool_source": "nuclei",
                                }
                            )
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            logger.error(f"[Nuclei] Parsing error: {e}")

        return findings

    def _map_owasp(self, item: dict) -> str:
        info = item.get("info", {})
        tags = info.get("tags", [])
        if isinstance(tags, str):
            tags = [tags]
        tag_str = " ".join(tags).lower()

        if "sqli" in tag_str or "sql" in tag_str:
            return "A03:2021 - Injection"
        if "xss" in tag_str:
            return "A03:2021 - Injection"
        if "ssrf" in tag_str:
            return "A10:2021 - SSRF"
        if "lfi" in tag_str or "traversal" in tag_str:
            return "A01:2021 - Broken Access Control"
        if "auth" in tag_str:
            return "A07:2021 - Identification Failures"
        if "cve" in tag_str:
            return "A06:2021 - Vulnerable Components"
        return "A05:2021 - Security Misconfiguration"
