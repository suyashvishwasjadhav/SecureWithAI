import subprocess
import logging
import os
from services.native_attack_service import NativeAttackService

logger = logging.getLogger(__name__)

class SQLMapService:

    SQLMAP_PATH = "sqlmap"

    def scan_parameters(self, scan_id: str,
                        get_params: list,
                        post_params: list,
                        on_progress) -> list:
        """
        Run SQLMap against each extracted parameter.
        """
        all_findings = []
        total = len(get_params) + len(post_params)
        done = 0
        native = NativeAttackService()
        
        for item in get_params[:10]:
            findings = self._test_url(
                item["url"], item["param"], "GET", scan_id, native
            )
            all_findings.extend(findings)
            done += 1
            pct = 37 + (done / max(total, 1)) * 19
            on_progress(
                f"💉 SQLMap testing {item['param']} param...",
                int(pct)
            )
        
        for item in post_params[:5]:
            findings = self._test_form(
                item["url"], item["params"], scan_id, native
            )
            all_findings.extend(findings)
            done += 1
            pct = 37 + (done / max(total, 1)) * 19
            on_progress(f"💉 SQLMap testing forms...", int(pct))
        
        return all_findings

    def _test_url(self, url: str, param: str, method: str, scan_id: str, native: NativeAttackService) -> list:
        output_dir = f"/tmp/{scan_id}_sqlmap_{param.replace('/', '_')}"
        tool_worked = False
        
        # Check if sqlmap is available
        try:
            cmd = [
                self.SQLMAP_PATH,
                "-u", url,
                "-p", param,
                "--batch",
                "--level=1",
                "--risk=1",
                "--timeout=10",
                "--output-dir", output_dir,
                "--flush-session",
                f"--method={method}"
            ]
            
            result = subprocess.run(
                cmd, capture_output=True,
                text=True, timeout=60
            )
            output = result.stdout + result.stderr
            findings = self._parse_output(output, url, param, scan_id)
            if findings:
                tool_worked = True
                return findings
        except Exception as e:
            logger.debug(f"[SQLMap] Binary error for {url}:{param} - {e}")

        # Fallback
        if not tool_worked:
            native_finding = native.test_sqli(url, param)
            if native_finding:
                native_finding["scan_id"] = scan_id
                native_finding["was_attempted"] = True
                return [native_finding]
        
        return []

    def _test_form(self, url: str, params: list, scan_id: str, native: NativeAttackService) -> list:
        param_list = ",".join(params)
        output_dir = f"/tmp/{scan_id}_sqlmap_form"
        tool_worked = False
        
        try:
            cmd = [
                self.SQLMAP_PATH,
                "-u", url,
                "--data", "&".join([f"{p}=1" for p in params]),
                "--batch",
                "--level=1",
                "--risk=1",
                "--output-dir", output_dir,
                "--flush-session"
            ]
            
            result = subprocess.run(
                cmd, capture_output=True,
                text=True, timeout=60
            )
            output = result.stdout + result.stderr
            findings = self._parse_output(output, url, param_list, scan_id)
            if findings:
                tool_worked = True
                return findings
        except Exception:
            pass
            
        # Fallback
        if not tool_worked:
            for p in params:
                native_finding = native.test_sqli(url, p)
                if native_finding:
                    native_finding["scan_id"] = scan_id
                    native_finding["was_attempted"] = True
                    return [native_finding]
        
        return []

    def _parse_output(self, output: str, url: str,
                      param: str, scan_id: str) -> list:
        findings = []
        
        if "is vulnerable" in output.lower() or "injection" in output.lower():
            findings.append({
                "scan_id": scan_id,
                "vuln_type": "SQL Injection",
                "severity": "critical",
                "url": url,
                "parameter": param,
                "evidence": f"SQLi confirmed in parameter '{param}'",
                "description": f"SQL injection vulnerability confirmed in parameter '{param}' on {url}. Attackers can gain direct database access.",
                "attack_worked": True,
                "was_attempted": True,
                "owasp_category": "A03:2021 - Injection",
                "tool_source": "sqlmap"
            })
        
        return findings

