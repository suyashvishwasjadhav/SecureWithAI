import subprocess
import json
import logging

logger = logging.getLogger(__name__)

class TrivyService:

    def scan(self, code_path: str, scan_id: str, on_progress) -> list:
        on_progress("📦 Scanning dependencies for known CVEs...", 70)
        output_file = f"/tmp/{scan_id}_trivy.json"
        
        cmd = [
            "trivy",
            "fs",
            "--format", "json",
            "--output", output_file,
            "--severity", "CRITICAL,HIGH,MEDIUM",
            "--quiet",
            code_path
        ]
        
        try:
            subprocess.run(cmd, capture_output=True, timeout=120)
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            if isinstance(e, FileNotFoundError):
                msg = "❌ Trivy is not installed on the system server"
                on_progress(msg, 70)
                logger.error(msg)
            else:
                on_progress("⚠️ Trivy timed out, skipping...", 70)
            return []
        
        return self.parse_output(output_file, scan_id, on_progress)

    def parse_output(self, output_file: str, scan_id: str, on_progress) -> list:
        findings = []
        SEV_MAP = {"CRITICAL": "critical", "HIGH": "high", "MEDIUM": "medium", "LOW": "low"}
        
        try:
            with open(output_file) as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
        
        for result in data.get("Results", []):
            for vuln in result.get("Vulnerabilities", []):
                cve_id = vuln.get("VulnerabilityID", "UNKNOWN")
                pkg = vuln.get("PkgName", "unknown")
                installed = vuln.get("InstalledVersion", "unknown")
                fixed = vuln.get("FixedVersion", "latest")
                severity = SEV_MAP.get(vuln.get("Severity", "MEDIUM"), "medium")
                title = vuln.get("Title", "Vulnerability found")
                
                findings.append({
                    "scan_id": scan_id,
                    "vuln_type": "Vulnerable Dependency",
                    "severity": severity,
                    "file_path": result.get("Target", ""),
                    "evidence": f"{cve_id}: {pkg}@{installed}",
                    "description": f"Package {pkg} version {installed} has known vulnerability {cve_id}: {title}. Fix: upgrade to {fixed}.",
                    "attack_worked": severity in ["critical", "high"],
                    "owasp_category": "A06:2021 - Vulnerable and Outdated Components",
                    "tool_source": "trivy"
                })
        
        if findings:
            on_progress(f"📦 Found {len(findings)} vulnerable dependencies", 83)
        else:
            on_progress("✅ No known vulnerable dependencies found", 83)
        
        return findings
